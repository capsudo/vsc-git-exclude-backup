const vscode = require('vscode');

const {
  GITHUB_API_BASE_URL,
  GITHUB_API_VERSION,
  GITHUB_AUTH_PROVIDER_ID,
  GITHUB_AUTH_SCOPES
} = require('./constants');

// asks VSC for GitHub session used by this extension
// ex: returns session with account.label "octocat" and accessToken for GitHub API
async function getGitHubAuthenticationSession() {
  return vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, GITHUB_AUTH_SCOPES, {
    createIfNone: true
  });
}

// returns GitHub REST client using existing access token
// ex: client.requestJson({ method: "GET", path: "/user" }) returns authenticated user JSON
function createGitHubClient(accessToken) {
  return {
    requestJson(requestOptions) {
      return requestGitHubJson(accessToken, requestOptions);
    },

    getAuthenticatedUser() {
      return requestGitHubJson(accessToken, {
        method: 'GET',
        path: '/user'
      });
    }
  };
}

// signs in through VSC GitHub auth, then reads current GitHub user
// ex: returns { sessionAccount: { label: "octocat" }, user: { login: "octocat" } }
async function readAuthenticatedGitHubUser() {
  const gitHubAuthenticationSession = await getGitHubAuthenticationSession();
  const gitHubClient = createGitHubClient(gitHubAuthenticationSession.accessToken);
  const authenticatedGitHubUser = await gitHubClient.getAuthenticatedUser();

  return {
    sessionAccount: gitHubAuthenticationSession.account,
    user: authenticatedGitHubUser
  };
}

// sends JSON request to GitHub REST API and returns parsed JSON body
// ex: requestGitHubJson(token, { method: "GET", path: "/user" })
async function requestGitHubJson(accessToken, requestOptions) {
  const method = requestOptions.method || 'GET';
  const path = requestOptions.path;
  const url = `${GITHUB_API_BASE_URL}${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION
  };

  const fetchOptions = {
    method,
    headers
  };

  if (requestOptions.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(requestOptions.body);
  }

  const response = await fetch(url, fetchOptions);
  const responseText = await response.text();

  if (requestOptions.allowNotFound && response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(getGitHubRequestErrorMessage(method, path, response, responseText));
  }

  if (!responseText) {
    return undefined;
  }

  return JSON.parse(responseText);
}

// returns readable error for GitHub REST request failure
// ex: "GitHub request GET /user failed with 401 Bad credentials"
function getGitHubRequestErrorMessage(method, path, response, responseText) {
  const responseMessage = getGitHubResponseMessage(responseText);

  if (responseMessage) {
    return `GitHub request ${method} ${path} failed with ${response.status}: ${responseMessage}`;
  }

  return `GitHub request ${method} ${path} failed with ${response.status} ${response.statusText}`;
}

// returns GitHub error message from JSON response body, or plain text body
// ex: '{"message":"Bad credentials"}' returns "Bad credentials"
function getGitHubResponseMessage(responseText) {
  if (!responseText) {
    return undefined;
  }

  try {
    const responseJson = JSON.parse(responseText);
    return responseJson.message || responseText;
  } catch (_error) {
    return responseText;
  }
}

module.exports = {
  createGitHubClient,
  getGitHubAuthenticationSession,
  readAuthenticatedGitHubUser
};
