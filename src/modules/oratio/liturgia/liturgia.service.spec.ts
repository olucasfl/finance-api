import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { LiturgiaService } from './liturgia.service';
import * as missaBuilder from './builders/missa.builder';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// buildMissa's own shaping logic belongs to missa.builder's own tests —
// here we only care that LiturgiaService fetches the right data and
// hands it off, so it's stubbed rather than fed a full fake API payload.
jest.mock('./builders/missa.builder');
const mockedBuildMissa = missaBuilder.buildMissa as jest.Mock;

describe('LiturgiaService', () => {
  let service: LiturgiaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LiturgiaService],
    }).compile();

    service = module.get<LiturgiaService>(LiturgiaService);
  });

  describe('getToday', () => {
    it("fetches today's liturgy from the public API without a date query string", async () => {
      const data = { liturgia: 'Ferial' };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await service.getToday();

      expect(mockedAxios.get).toHaveBeenCalledWith('https://liturgia.up.railway.app/v2/');
      expect(result).toBe(data);
    });
  });

  describe('getByDate', () => {
    it('fetches the liturgy for a specific day/month/year', async () => {
      const data = { liturgia: 'Domingo' };
      mockedAxios.get.mockResolvedValue({ data });

      const result = await service.getByDate('25', '12', '2026');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://liturgia.up.railway.app/v2/?dia=25&mes=12&ano=2026',
      );
      expect(result).toBe(data);
    });
  });

  describe('getFull', () => {
    it('fetches the raw liturgy for the date and shapes it through buildMissa', async () => {
      const rawData = { liturgia: 'Ferial', leituras: {} };
      const shaped = { secoes: [] };

      mockedAxios.get.mockResolvedValue({ data: rawData });
      mockedBuildMissa.mockReturnValue(shaped);

      const result = await service.getFull('25', '12', '2026');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://liturgia.up.railway.app/v2/?dia=25&mes=12&ano=2026',
      );
      expect(mockedBuildMissa).toHaveBeenCalledWith(rawData);
      expect(result).toBe(shaped);
    });
  });
});
