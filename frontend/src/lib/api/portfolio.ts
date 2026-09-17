import { mockGetPortfolioSummary } from '../../mocks/portfolio';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  return mockGetPortfolioSummary();
}
