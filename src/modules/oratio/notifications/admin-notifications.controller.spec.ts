import { AdminNotificationsController } from './admin-notifications.controller';

/*
Instancia o controller direto — o AdminGuard/JwtAuthGuard aplicados via
@UseGuards a nível de classe já são cobertos nos próprios specs; aqui só
importa a delegação de cada rota pro NotificationsSendService.
*/
describe('AdminNotificationsController', () => {
  let controller: AdminNotificationsController;
  let send: Record<string, jest.Mock>;

  const req = (userId = 'admin-1') => ({ user: { userId } });

  beforeEach(() => {
    send = {
      createCampaign: jest.fn(),
      listCampaigns: jest.fn(),
      subscribersCount: jest.fn(),
      listRules: jest.fn(),
      updateRule: jest.fn(),
      createRule: jest.fn(),
      deleteRule: jest.fn(),
      deleteAllCampaigns: jest.fn(),
      deleteCampaign: jest.fn(),
    };

    controller = new AdminNotificationsController(send as any);
  });

  it('create() defaults audience to ALL unless explicitly SPECIFIC', () => {
    controller.create(req('admin-1'), {
      title: 'Título',
      body: 'Corpo',
      url: '/x',
      audience: 'ALL',
    } as any);

    expect(send.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'ALL', createdBy: 'admin-1' }),
    );
  });

  it('create() forwards SPECIFIC audience with the target userIds', () => {
    controller.create(req('admin-1'), {
      title: 'Título',
      audience: 'SPECIFIC',
      userIds: ['u1', 'u2'],
    } as any);

    expect(send.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'SPECIFIC', userIds: ['u1', 'u2'] }),
    );
  });

  it('create() treats any non-SPECIFIC value as ALL', () => {
    controller.create(req('admin-1'), { title: 'X', audience: 'anything-else' } as any);

    expect(send.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ audience: 'ALL' }));
  });

  it('list() delegates to listCampaigns', () => {
    controller.list();
    expect(send.listCampaigns).toHaveBeenCalled();
  });

  it('subscribers() delegates to subscribersCount', () => {
    controller.subscribers();
    expect(send.subscribersCount).toHaveBeenCalled();
  });

  it('rules() delegates to listRules', () => {
    controller.rules();
    expect(send.listRules).toHaveBeenCalled();
  });

  it('updateRule() delegates the key and body', () => {
    const body = { enabled: false } as any;
    controller.updateRule('rule-1', body);
    expect(send.updateRule).toHaveBeenCalledWith('rule-1', body);
  });

  it('createRule() delegates the body', () => {
    const body = { key: 'rule-1' } as any;
    controller.createRule(body);
    expect(send.createRule).toHaveBeenCalledWith(body);
  });

  it('deleteRule() delegates the key', () => {
    controller.deleteRule('rule-1');
    expect(send.deleteRule).toHaveBeenCalledWith('rule-1');
  });

  it('deleteAll() delegates to deleteAllCampaigns', () => {
    controller.deleteAll();
    expect(send.deleteAllCampaigns).toHaveBeenCalled();
  });

  it('deleteCampaign() delegates the campaign id', () => {
    controller.deleteCampaign('campaign-1');
    expect(send.deleteCampaign).toHaveBeenCalledWith('campaign-1');
  });
});
