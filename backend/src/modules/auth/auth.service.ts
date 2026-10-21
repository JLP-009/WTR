import { eq, and, isNull, gt, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { Database } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import { verifyPassword, hashPassword } from '../../common/auth/password.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken, type TokenPayload } from '../../common/auth/jwt.js';
import type { Environment } from '../../config/env.js';
import type { LoginRequest, LoginResponseData, RefreshResponseData, RegisterRequest, ResetPasswordRequest, ChangePasswordRequest } from './auth.types.js';

export class AuthService {
  public constructor(private readonly db: Database, private readonly env: Environment) {}

  public async register(req: RegisterRequest): Promise<LoginResponseData> {
    const cleanParticipantId = req.participant_id.trim().toUpperCase();
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.participantId, cleanParticipantId))
      .limit(1);

    if (existing) {
      throw new AppError('PARTICIPANT_ID_EXISTS', 409, `This ID '${cleanParticipantId}' already exists. Please select another user ID.`);
    }

    if (cleanParticipantId.startsWith('ADMIN')) {
      throw new AppError('RESERVED_ID', 400, 'Participant IDs starting with ADMIN are reserved for system administrators. Please select another user ID.');
    }

    const passwordHash = await hashPassword(req.password);
    const displayName = `${req.first_name.trim()} ${req.last_name.trim()}`;
    const publicId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;

    let newUser;
    try {
      [newUser] = await this.db
        .insert(schema.users)
        .values({
          publicId,
          participantId: cleanParticipantId,
          displayName,
          passwordHash,
          registeredDeviceId: req.device_id || null,
          role: 'PARTICIPANT',
          accountStatus: 'ACTIVE',
        })
        .returning();
    } catch (dbErr: any) {
      if (dbErr?.code === '23505' || dbErr?.message?.includes('users_participant_id_unique')) {
        throw new AppError('PARTICIPANT_ID_EXISTS', 409, `This ID '${cleanParticipantId}' already exists. Please select another user ID.`);
      }
      throw dbErr;
    }

    // Automatically link to active trading event and initialize portfolio with starting capital
    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (activeEvent) {
      await this.db
        .insert(schema.eventParticipants)
        .values({
          eventId: activeEvent.id,
          userId: newUser.id,
        })
        .onConflictDoNothing();

      await this.db
        .insert(schema.portfolios)
        .values({
          eventId: activeEvent.id,
          userId: newUser.id,
          startingCapital: '1000000',
          availableCash: '1000000',
          reservedCash: '0',
          realizedPnl: '0',
          dailyPnl: '0',
        })
        .onConflictDoNothing();
    }

    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      publicId: newUser.publicId,
      participantId: newUser.participantId,
      role: newUser.role,
    };

    const { token: accessToken, expiresInSeconds } = await signAccessToken(tokenPayload, this.env);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(schema.refreshTokens).values({
      userId: newUser.id,
      tokenHash,
      expiresAt,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: rawRefreshToken,
      user: {
        user_id: newUser.publicId,
        participant_id: newUser.participantId,
        display_name: newUser.displayName,
        role: newUser.role,
      },
    };
  }

  public async resetPassword(req: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    const cleanParticipantId = req.participant_id.trim().toUpperCase();
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.participantId, cleanParticipantId))
      .limit(1);

    if (!user) {
      throw new AppError('NOT_FOUND', 404, `No account found with Participant ID '${cleanParticipantId}'.`);
    }

    if (user.role === 'ADMIN') {
      throw new AppError('FORBIDDEN', 403, 'Administrator credentials cannot be reset through the public recovery form. Please contact system operations.');
    }

    // Verify Device Fingerprint for participant account
    if (user.role === 'PARTICIPANT' && user.registeredDeviceId && req.device_id) {
      if (user.registeredDeviceId !== req.device_id) {
        throw new AppError(
          'UNAUTHORIZED_DEVICE',
          403,
          'Access Denied: Password reset is only permitted from the phone/device on which this account was registered.'
        );
      }
    }

    // Verify first or last name matches display name for identity verification
    const actualName = user.displayName.trim().toLowerCase();
    const fName = req.first_name.trim().toLowerCase();
    const lName = req.last_name.trim().toLowerCase();

    const matched = actualName.includes(fName) || actualName.includes(lName) || `${fName} ${lName}` === actualName;
    if (!matched) {
      throw new AppError('VERIFICATION_FAILED', 400, 'The First and Last Name provided do not match our records for this Participant ID.');
    }

    const newPasswordHash = await hashPassword(req.new_password);

    await this.db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    // Invalidate existing refresh tokens
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.userId, user.id));

    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }

  public async changePassword(userId: string, req: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User account not found.');
    }

    const isMatch = await verifyPassword(req.current_password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 400, 'The current password you entered is incorrect.');
    }

    const newPasswordHash = await hashPassword(req.new_password);
    await this.db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return {
      success: true,
      message: 'Password changed successfully.',
    };
  }

  public async isParticipantIdAvailable(rawId: string): Promise<{ available: boolean; reason?: string }> {
    const cleanId = rawId.trim().toUpperCase();
    if (!cleanId) {
      return { available: false, reason: 'Please enter a valid User ID' };
    }
    if (cleanId.startsWith('ADMIN')) {
      return { available: false, reason: 'IDs starting with ADMIN are reserved. Please select another user ID.' };
    }
    const [existing] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.participantId, cleanId))
      .limit(1);

    if (existing) {
      return { available: false, reason: `This ID '${cleanId}' already exists. Please select another user ID.` };
    }
    return { available: true };
  }

  public async login(req: LoginRequest): Promise<LoginResponseData> {
    const cleanParticipantId = req.participant_id.trim().toUpperCase();
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.participantId, cleanParticipantId))
      .limit(1);

    if (!user) {
      throw new AppError('AUTHENTICATION_FAILED', 401, 'Invalid participant ID or password.');
    }

    if (user.accountStatus === 'DISABLED') {
      throw new AppError('ACCOUNT_DISABLED', 403, 'Account is disabled.');
    }

    const isValidPassword = await verifyPassword(user.passwordHash, req.password);
    if (!isValidPassword) {
      throw new AppError('AUTHENTICATION_FAILED', 401, 'Invalid participant ID or password.');
    }

    // Device Fingerprinting & Binding Check for participants (Admin is exempt)
    if (user.role === 'PARTICIPANT' && req.device_id) {
      if (user.registeredDeviceId) {
        if (user.registeredDeviceId !== req.device_id) {
          throw new AppError(
            'UNAUTHORIZED_DEVICE',
            403,
            'Access Denied: This account is locked to another phone/device. Logins from unauthorized devices are blocked.'
          );
        }
      } else {
        // Automatically bind this first successful login device to the account
        await this.db
          .update(schema.users)
          .set({ registeredDeviceId: req.device_id, updatedAt: new Date() })
          .where(eq(schema.users.id, user.id));
      }
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      publicId: user.publicId,
      participantId: user.participantId,
      role: user.role,
    };

    const { token: accessToken, expiresInSeconds } = await signAccessToken(tokenPayload, this.env);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.db.insert(schema.refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: rawRefreshToken,
      user: {
        user_id: user.publicId,
        participant_id: user.participantId,
        display_name: user.displayName,
        role: user.role,
      },
    };
  }

  public async refresh(rawRefreshToken: string): Promise<RefreshResponseData> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const now = new Date();

    const [record] = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          isNull(schema.refreshTokens.revokedAt),
          gt(schema.refreshTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!record) {
      throw new AppError('INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token.');
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, record.userId))
      .limit(1);

    if (!user || user.accountStatus === 'DISABLED') {
      throw new AppError('ACCOUNT_DISABLED', 403, 'User account is no longer active.');
    }

    // Revoke old refresh token (rotation)
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: now })
      .where(eq(schema.refreshTokens.id, record.id));

    const tokenPayload: TokenPayload = {
      userId: user.id,
      publicId: user.publicId,
      participantId: user.participantId,
      role: user.role,
    };

    const { token: accessToken, expiresInSeconds } = await signAccessToken(tokenPayload, this.env);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(schema.refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: newRawRefreshToken,
    };
  }

  public async logout(userId: string, rawRefreshToken?: string): Promise<void> {
    const now = new Date();
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await this.db
        .update(schema.refreshTokens)
        .set({ revokedAt: now })
        .where(eq(schema.refreshTokens.tokenHash, tokenHash));
    } else {
      await this.db
        .update(schema.refreshTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(schema.refreshTokens.userId, userId),
            isNull(schema.refreshTokens.revokedAt)
          )
        );
    }
  }

  public async getUserById(userId: string): Promise<schema.User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return user || null;
  }
}
