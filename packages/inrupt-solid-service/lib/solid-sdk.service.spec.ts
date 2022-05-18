/* eslint-disable @typescript-eslint/dot-notation */
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

    service = new SolidSDKService({ clientName: 'test' });

  });

  it('should be correctly instantiated', () => {

    expect(service).toBeTruthy();

  });

  it('should error when clientSecret is set but clientId is not', () => {

    expect(() => new SolidSDKService({ clientName: 'test', clientSecret: 'mockSecret' })).toThrow('clientId must be set if clientSecret is set');

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
      clientName: 'test',
      clientSecret: 'mockSecret',
      clientId: 'mockId',
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
        clientName: mockClient.clientName,
      }));

    });

    it('should call login with correct clientname, secret and id if set', async () => {

      service = new SolidSDKService(mockClient);

      (login as any) = jest.fn();
      service.getIssuers = jest.fn(async () => [ mockIssuer ]);

      await service.login('https://web.id/');

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient.clientName,
        clientId: mockClient.clientId,
        clientSecret: mockClient.clientSecret,
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
      clientName: 'test',
      clientSecret: 'mockSecret',
      clientId: 'mockId',
    };

    it('should error when issuer is undefined', async () => {

      await expect(service.loginWithIssuer(undefined)).rejects.toThrow('Issuer should be set.: ');

    });

    it('should call login with correct clientname', async () => {

      (login as any) = jest.fn();

      await service.loginWithIssuer(mockIssuer);

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient.clientName,
      }));

    });

    it('should call login with correct clientname, secret and id if set', async () => {

      service = new SolidSDKService(mockClient);
      (login as any) = jest.fn();

      await service.loginWithIssuer(mockIssuer);

      expect(sdk.login).toHaveBeenCalledWith(expect.objectContaining({
        oidcIssuer: mockIssuer.uri,
        clientName: mockClient.clientName,
        clientId: mockClient.clientId,
        clientSecret: mockClient.clientSecret,
      }));

    });

  });

  describe('logout', () => {

    it('should call sdk.logout', async () => {

      (sdk.logout as any) = jest.fn(async () => ({}));

      await service.logout();

      expect(sdk.logout).toHaveBeenCalled();

    });

  });

  describe('getProfile', () => {

    const webId = 'https://web.id/alice';

    it('should always return webid in profile', async () => {

      (service['getProfileThing'] as any) = jest.fn(async () => 'profile thing');
      (sdk.getStringNoLocale as any) = jest.fn(() => null);

      await expect(service.getProfile('https://web.id/alice')).resolves.toEqual({ uri: webId, name: undefined });

    });

    it('should include name in return when it is set', async () => {

      (service['getProfileThing'] as any) = jest.fn(async () => 'profile thing');
      (sdk.getStringNoLocale as any) = jest.fn(() => 'name');

      await expect(service.getProfile('https://web.id/alice')).resolves.toEqual({ uri: webId, name: 'name' });

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

    beforeEach(() => {

      mockProfile = sdk.removeAll(mockProfile, 'http://www.w3.org/ns/solid/interop#hasAuthorizationAgent');

    });

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

    // it('should return agent with standard icon when no favicon found', async () => {

    //   // should be called when fetch throws, but currently because we return Promise.all,
    //   // the error will always be thrown on the place where getAuthorizationAgents is called

    //   const mockAuthorizationAgent = 'https://authz.agent';
    //   mockProfile = addUrl(mockProfile, 'http://www.w3.org/ns/solid/interop#hasAuthorizationAgent', mockAuthorizationAgent);

    //   fetchMock.mockRejectOnce();
    //   (service as any).getProfileThing = jest.fn(async () => mockProfile);
    //   const result = service.getAuthorizationAgents(mockWebId);

    //   await expect(result).resolves.toHaveLength(1);
    //   const awaitedResult = await result;

    //   expect(awaitedResult[0]).toEqual(expect.objectContaining({
    //     uri: mockAuthorizationAgent,
    //     icon: expect.stringContaining('donkey.bike'),
    //   }));

    // });

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

  describe('getProfileDataset', () => {

    it('should error when fetching dataset fails', async () => {

      (sdk.getSolidDataset as any) = jest.fn(() => { throw new Error(); });

      await expect(service['getProfileDataset']('https://web.id/alice')).rejects.toThrow(`No profile for WebId: `);

    });

    it('should error when no dataset was found', async () => {

      (sdk.getSolidDataset as any) = jest.fn(() => undefined);

      await expect(service['getProfileDataset']('https://web.id/alice')).rejects.toThrow(`Could not read profile for WebId: `);

    });

    it('should return profile dataset when successful', async () => {

      (sdk.getSolidDataset as any) = jest.fn(() => 'profile dataset');

      await expect(service['getProfileDataset']('https://web.id/alice')).resolves.toEqual('profile dataset');

    });

  });

  describe('getProfileThing', () => {

    it('should error when webid is undefined', async () => {

      await expect(service['getProfileThing'](undefined)).rejects.toThrow(`WebId must be defined.`);

    });

    it('should error when webid is an invalid URL', async () => {

      await expect(service['getProfileThing']('invalid.url')).rejects.toThrow(`Invalid WebId: `);

    });

    it('should throw when no profile thing was found', async () => {

      (service['getProfileDataset'] as any) = jest.fn(async () => 'profile dataset');
      (sdk.getThing as any) = jest.fn(() => undefined);

      await expect(service['getProfileThing']('https://web.id/alice')).rejects.toThrow(`No profile info for WebId: `);

    });

    it('should return the profile Thing when successful', async () => {

      (service['getProfileDataset'] as any) = jest.fn(async () => 'profile dataset');
      (sdk.getThing as any) = jest.fn(() => 'profile thing');

      await expect(service['getProfileThing']('https://web.id/alice')).resolves.toEqual('profile thing');

    });

  });

});
