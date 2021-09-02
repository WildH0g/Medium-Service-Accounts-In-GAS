// jshint esversion: 9
// jshint laxbreak: true

/*************************************
 *
 * OAUTH                             *
 *
 *************************************/

const serviceAccount = {
  type: 'service_account',
  project_id: '',
  private_key_id: '',
  private_key: '',
  client_email: '',
  client_id: '',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: ''
};

const { private_key, client_email, project_id } = serviceAccount;

const createService = (name, serviceAccount, scopes, userToImpersonate) => {
  return OAuth2.createService(name)
    .setSubject(userToImpersonate)
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setPrivateKey(serviceAccount.private_key)
    .setIssuer(serviceAccount.client_email)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setCache(CacheService.getUserCache())
    .setLock(LockService.getUserLock())
    .setScope(scopes);
};

const sendRequest = (url, oauthParams, payload) => {
  const { serviceName, serviceAccount, scopes, userToImpersonate } =
    oauthParams;

  const oauthService = createService(
    serviceName,
    serviceAccount,
    scopes,
    userToImpersonate
  );

  if (!oauthService.hasAccess()) {
    Logger.log('BQ ERROR IS ' + oauthService.getLastError());
    return;
  }

  const headers = {
    Authorization: `Bearer ${oauthService.getAccessToken()}`,
  };

  const options = {
    method: 'post',
    headers,
    contentType: 'application/json',
    payload,
    muteHttpExceptions: true,
  };

  return JSON.parse(UrlFetchApp.fetch(url, options).getContentText());
};

/*************************************
 *
 * FIREBASE                          *
 *
 *************************************/

const getFirestore = () =>
  FirestoreApp.getFirestore(client_email, private_key, project_id);

const createUser = (id, data) => {
  const firestore = getFirestore();
  firestore.createDocument(`users/${id}`, data);
};

const createUserDmitry = () =>
  createUser('dmitry', {
    name: 'Dmitry',
    profession: 'Google Apps Script Developer',
    site: 'https://www.wurkspaces.dev',
  });

/*************************************
 *
 * BIGQUERY                          *
 *
 *************************************/

const runQuery = query => {
  const oauthParams = {
    serviceName: 'BigQuery',
    serviceAccount,
    scopes: ['https://www.googleapis.com/auth/bigquery'],
  };
  const gcpProject = 'service-accounts-article';
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${gcpProject}/queries`;
  const payload = JSON.stringify({ query, useLegacySql: false });
  return sendRequest(url, oauthParams, payload);
};

const insertUserIntoBigQuery = () => {
  const dataset = 'demo';
  const table = 'users';
  const query = `INSERT INTO \`${dataset}.${table}\` (name, profession, website)
    VALUES ("Dmitry", "Google Apps Script Developer", "https://www.wurkspaces.dev")`;
  const response = runQuery(query);
  console.log(response);
};

/*************************************
 *
 * ADMIN DIRECTORY                   *
 *
 *************************************/

const insertUser = (userEmail, groupKey) => {
  const url = `https://admin.googleapis.com/admin/directory/v1/groups/${groupKey}/members`;
  const oauthParams = {
    serviceName: 'GoogleGroups',
    serviceAccount,
    scopes: ['https://www.googleapis.com/auth/admin.directory.group'],
    userToImpersonate: 'super-admin@domain.com',
  };
  const payload = JSON.stringify({
    email: userEmail,
    role: 'MEMBER',
  });
  return sendRequest(url, oauthParams, payload);
};

const doInsert = () => {
  const response = insertUser('user@domain.com', 'some-group@domain.com');
  console.log(response);
};
