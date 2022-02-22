import { addUrl, createSolidDataset, createThing, saveSolidDatasetAt, getDefaultSession, login, handleIncomingRedirect } from '@digita-ai/inrupt-solid-client';
import * as sdk from '@digita-ai/inrupt-solid-client';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { Issuer } from './models/issuer.model';
import { SolidSDKService } from './solid-sdk.service';

enableFetchMocks();

describe('SolidSDKService', () => {

  let service: SolidSDKService;

  const mockWebId = 'https://pods.digita.ai/leapeeters/profile/card#me';
  const mockStorage = mockWebId.replace('profile/card#me', '');
  let mockProfile = createThing({ url: mockWebId });
  mockProfile = addUrl(mockProfile, 'http://www.w3.org/ns/pim/space#storage', mockStorage);

  beforeEach(async () => {

    service = new SolidSDKService('test');

  });

  it('should be correctly instantiated', () => {

    expect(service).toBeTruthy();

  });

  it('should error when clientSecret is set but clientId is not', () => {

    expect(() => new SolidSDKService('test', { 'https://issuer/':{ clientName: 'test', clientSecret: 'mockSecret' } })).toThrow('clientId must be set if clientSecret is set');

  });

  describe('addIssuers', () => {

    it('should add issuer triples to profile', async () => {

      // eslint-disable-next-line @typescript-eslint/dot-notation
      service['getProfileThing'] = jest.fn(async () => mockProfile);
      // eslint-disable-next-line @typescript-eslint/dot-notation
      service['getProfileDataset'] = jest.fn(async () => createSolidDataset());
      (saveSolidDatasetAt as any) = jest.fn(async () => createSolidDataset());

      const newIssuers: Issuer[] = [ {
        icon: '',
        description: '',
        uri: 'https://test.uri/',
      } ];

      const addUrlSpy = jest.spyOn(sdk, 'addUrl');
      const setThingSpy = jest.spyOn(sdk, 'setThing');

      const result = await service.addIssuers(mockWebId, newIssuers);
      expect(result).toEqual(newIssuers);
      expect(addUrlSpy).toHaveBeenCalledTimes(newIssuers.length);
      expect(setThingSpy).toHaveBeenCalledTimes(1);
      expect(sdk.saveSolidDatasetAt).toHaveBeenCalledTimes(1);

    });

  });

  describe('login', () => {

    const mockIssuer: Issuer = {
      uri: 'https://issuer/',
      icon: 'https://issuer/icon.png',
      description: 'mock issuer',
    };

    const mockIssuer2: Issuer = {
      uri: 'https://issuer-2/',
      icon: 'https://issuer-2/icon.png',
      description: 'mock issuer 2',
    };

    const mockClient = {
      [mockIssuer.uri]: {
        clientName: 'test',
        clientSecret: 'mockSecret',
        clientId: 'mockId',
      },
    };

    it('should error when webId is undefined', async () => {

      service.getIssuers = jest.fn(async () => [ mockIssuer ]);
      await expect(service.login(undefined)).rejects.toThrow('WebId should be set.: ');

    });

    it('should error when issuer could not be found', async () => {

      service.getIssuer = jest.fn(async () => undefined);
      await expect(service.login('https://web.id/')).rejects.toThrow('Issuer should be set.: ');

    });

    it('should call login with correct clientname', async () => {

      (login as any) = jest.fn();
      service.getIssuers = jest.fn(async () => [ mockIssuer ]);

      await service.login('https://web.id/');

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
      }));

    });

    it('should call login with correct clientname, secret and id if set', async () => {

      service = new SolidSDKService('test', mockClient);

      (login as any) = jest.fn();
      service.getIssuers = jest.fn(async () => [ mockIssuer ]);

      await service.login('https://web.id/');

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
        clientId: mockClient[mockIssuer.uri].clientId,
        clientSecret: mockClient[mockIssuer.uri].clientSecret,
      }));

    });

    it('should call login with only clientname if no match was found in clients', async () => {

      service = new SolidSDKService('test', mockClient);
      (login as any) = jest.fn();
      // login with different issuer
      service.getIssuers = jest.fn(async () => [ mockIssuer2 ]);

      await service.login('https://web.id/');

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer2.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
        clientId: undefined,
        clientSecret: undefined,
      }));

    });

  });

  describe('loginWithIssuer', () => {

    const mockIssuer: Issuer = {
      uri: 'https://issuer/',
      icon: 'https://issuer/icon.png',
      description: 'mock issuer',
    };

    const mockIssuer2: Issuer = {
      uri: 'https://issuer-2/',
      icon: 'https://issuer-2/icon.png',
      description: 'mock issuer 2',
    };

    const mockClient = {
      [mockIssuer.uri]: {
        clientName: 'test',
        clientSecret: 'mockSecret',
        clientId: 'mockId',
      },
    };

    it('should error when issuer is undefined', async () => {

      await expect(service.loginWithIssuer(undefined)).rejects.toThrow('Issuer should be set.: ');

    });

    it('should call login with correct clientname', async () => {

      (login as any) = jest.fn();

      await service.loginWithIssuer(mockIssuer);

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
      }));

    });

    it('should call login with correct clientname, secret and id if set', async () => {

      service = new SolidSDKService('test', mockClient);
      (login as any) = jest.fn();

      await service.loginWithIssuer(mockIssuer);

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
        clientId: mockClient[mockIssuer.uri].clientId,
        clientSecret: mockClient[mockIssuer.uri].clientSecret,
      }));

    });

    it('should call login with only clientname if no match was found in clients', async () => {

      service = new SolidSDKService('test', mockClient);
      (login as any) = jest.fn();

      // login with different issuer
      await service.loginWithIssuer(mockIssuer2);

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer2.uri,
        clientName: mockClient[mockIssuer.uri].clientName,
        clientId: undefined,
        clientSecret: undefined,
      }));

    });

  });

  describe('getStorages', () => {

    it('should return correct values', async () => {

      // eslint-disable-next-line @typescript-eslint/dot-notation
      service['getProfileThing'] = jest.fn(async () => mockProfile);

      const result = await service.getStorages(mockWebId);
      expect(result.length).toEqual(1);
      expect(result).toContain(mockStorage);

    });

  });

  describe('getAuthorizationAgents', () => {

    it('should error when no authorization agents are present', async () => {

      (service as any).getProfileThing = jest.fn(async () => mockProfile);
      const result = service.getAuthorizationAgents(mockWebId);

      await expect(result).rejects.toThrow('No authorization agents for WebID: ');

    });

    it('should return the correct agent', async () => {

      const mockAuthorizationAgent = 'https://authz.agent';
      mockProfile = addUrl(mockProfile, 'http://www.w3.org/ns/solid/interop#hasAuthorizationAgent', mockAuthorizationAgent);

      fetchMock.mockResponseOnce('', { status: 200 });
      (service as any).getProfileThing = jest.fn(async () => mockProfile);
      const result = service.getAuthorizationAgents(mockWebId);

      await expect(result).resolves.toHaveLength(1);
      const awaitedResult = await result;
      expect(awaitedResult[0]).toEqual(expect.objectContaining({ uri: mockAuthorizationAgent }));

    });

  });

  describe('getDefaultSession', () => {

    it('should call getDefaultSession from SDK', () => {

      (getDefaultSession as any) = jest.fn(async () => ({}));
      service.getDefaultSession();
      expect(sdk.getDefaultSession).toHaveBeenCalledTimes(1);

    });

  });

  describe('getSession', () => {

    it('should call getSession with public restorePreviousSession parameter', async () => {

      (handleIncomingRedirect as any) = jest.fn(async () => ({ isLoggedIn: true, webId: 'mock' }));
      await service.getSession();
      expect(sdk.handleIncomingRedirect).toHaveBeenCalledWith({ restorePreviousSession: true });
      service.restorePreviousSession = false;
      await service.getSession();
      expect(sdk.handleIncomingRedirect).toHaveBeenCalledWith({ restorePreviousSession: false });

    });

  });

  describe('getProfileThing', () => {

    it('should error when webId is undefined', async () => {

      // eslint-disable-next-line @typescript-eslint/dot-notation
      await expect(() => service['getProfileThing'](undefined)).rejects.toThrow();

    });

    it('should error when webId is invalid', async () => {

      // eslint-disable-next-line @typescript-eslint/dot-notation
      await expect(service['getProfileThing']('invalid-url')).rejects.toThrow();

    });

  });

});
