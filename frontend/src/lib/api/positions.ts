import { mockGetPositions, mockClosePosition } from '../../mocks/positions';
import type { Position, ClosePositionRequest, ClosePositionResponse } from '../../contracts/v1/positions';

export async function getPositions(): Promise<Position[]> {
  return mockGetPositions();
}

export async function closePosition(req: ClosePositionRequest): Promise<ClosePositionResponse> {
  return mockClosePosition(req);
}
