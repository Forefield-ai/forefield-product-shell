const DEFAULT_DEMO_USER_ID = 'demo_user';
const DEFAULT_DEMO_WORKSPACE_ID = 'demo_workspace';

function createDemoUserContext() {
  return {
    user_id: DEFAULT_DEMO_USER_ID,
    workspace_id: DEFAULT_DEMO_WORKSPACE_ID,
    mode: 'demo',
  };
}

module.exports = {
  createDemoUserContext,
  DEFAULT_DEMO_USER_ID,
  DEFAULT_DEMO_WORKSPACE_ID,
};
