import { browserInfo, wsPathHelpers } from '@bangle.io/api';
import { fileToBase64 } from '@bangle.io/git-file-sha';
import { pMap } from '@bangle.io/p-map';
import {
  BaseError,
  getLast,
  serialExecuteQueue,
  sleep,
} from '@bangle.io/utils';

import { GITHUB_API_ERROR, INVALID_GITHUB_RESPONSE } from './errors';
import { githubGraphqlFetch, githubRestFetch } from './github-fetch';

export interface GithubTokenConfig {
  githubToken: string;
}

export interface GithubConfig extends GithubTokenConfig {
  owner: string;
  branch: string;
  repoName: string;
}

export interface GHTree {
  sha: string;
  // a map of wsPath and the mentioned object below
  tree: Map<string, { sha: string; url: string; wsPath: string }>;
}

// Only one of them is required
export const ALLOWED_GH_SCOPES = ['repo', 'public_repo'];

// TODO centralize this thing
const allowedFilePath = (path: string) => {
  if (path.includes(':')) {
    console.debug(
      "@bangle.io/github-storage: Found path with invalid char ':'",
      path,
    );

    return false;
  }
  if (path.includes('//')) {
    console.debug(
      "@bangle.io/github-storage: Found path with invalid char '//'",
      path,
    );

    return false;
  }
  if (path.length > 150) {
    console.debug(
      "@bangle.io/github-storage: Found path larger than the limit'",
      path,
    );

    return false;
  }

  const fileName = getLast(path.split('/'));

  if (fileName === undefined) {
    console.debug('@bangle.io/github-storage: Filename not found', path);

    return false;
  }

  if (fileName.startsWith('.')) {
    console.debug('@bangle.io/github-storage: Filename starts with "."', path);

    return false;
  }

  return true;
};

const RATELIMIT_STRING = `
rateLimit {
  limit
  cost
  remaining
  resetAt
}`;

async function makeV3GetApi({
  path,
  token,
  abortSignal,
  headers,
  isBlob,
}: {
  isBlob?: boolean;
  path: string;
  abortSignal?: AbortSignal;
  token: string;
  headers?: { [r: string]: string };
}): Promise<{ data: any; headers: Response['headers'] }> {
  const res = await githubRestFetch({
    path,
    token,
    abortSignal,
    headers,
    method: 'GET',
  });

  if (!res.ok) {
    return res.json().then((r) => {
      throw new BaseError({ message: r.message, code: GITHUB_API_ERROR });
    });
  }

  console.debug(
    'Github API limit left',
    res.headers.get('X-RateLimit-Remaining'),
  );

  const data = isBlob ? res.blob() : res.json();

  return {
    data: await data,
    headers: res.headers,
  };
}

async function makeGraphql({
  query,
  variables,
  token,
}: {
  query: string;
  variables: { [r: string]: any };
  token: string;
}): Promise<any> {
  const res = await githubGraphqlFetch({
    query,
    variables,
    token,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new BaseError({
      // json.message contains the Bad credentials error which is needed to ask for new tokens
      message: json.message || 'Github вернул неизвестный код',
      code: GITHUB_API_ERROR,
    });
  }

  if (json.errors && json.errors.length > 0) {
    console.debug('Github Graphql API error', json.errors[0]);
    const error = json.errors[0];

    throw new BaseError({
      message: error.message,
      code: GITHUB_API_ERROR,
    });
  }

  console.debug(
    'Github graphql API limit left',
    res.headers.get('X-RateLimit-Remaining'),
  );

  return json.data;
}

export type RepositoryInfo = {
  name: string;
  owner: string;
  branch: string;
  description: string;
};

export async function getBranchHead({
  config,
  abortSignal,
}: {
  config: GithubConfig;
  abortSignal?: AbortSignal;
}) {
  const query = `query ($repoName: String!, $branchName: String!, $owner: String!) {
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    repository(name: $repoName, owner: $owner) {
      description
      ref(qualifiedName: $branchName) {
        name
        prefix
        target {
          oid
        }
      }
    }
  }`;

  const result = await makeGraphql({
    query,
    variables: {
      repoName: config.repoName,
      branchName: config.branch,
      owner: config.owner,
    },
    token: config.githubToken,
  });

  const oid = result?.repository?.ref?.target?.oid;

  if (typeof oid === 'string') {
    return oid;
  }
  throw new BaseError({
    message: `Не могу получить доступ к ветке в ${config.repoName}.`,
    code: INVALID_GITHUB_RESPONSE,
  });
}

export async function hasValidGithubScope({
  abortSignal,
  token,
}: {
  token: GithubTokenConfig['githubToken'];
  abortSignal?: AbortSignal;
}) {
  let scopeStr = (await getScopes({ token, abortSignal })) || '';
  let scopes = scopeStr.split(',').map((s) => s.trim());

  return ALLOWED_GH_SCOPES.some((s) => scopes.includes(s));
}

export async function getScopes({
  abortSignal,
  token,
}: {
  token: GithubTokenConfig['githubToken'];
  abortSignal?: AbortSignal;
}): Promise<string | null> {
  const { headers } = await makeV3GetApi({
    path: `?cacheBust=${Date.now()}`,
    token: token,
    abortSignal,
  });

  return headers.get('X-OAuth-Scopes');
}

export async function* getRepos({
  token,
}: {
  token: GithubTokenConfig['githubToken'];
}): AsyncIterable<RepositoryInfo[]> {
  const query = `
    query ($after: String) {
      ${RATELIMIT_STRING}
      viewer {
        repositories(first: 50, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }
          edges {
            node {
              name
              defaultBranchRef {
                name
                target {
                  oid
                }
              }
              nameWithOwner
              description
            }
          }
        }
      }
    }`;
  let hasNextPage;

  let endCursor = undefined;
  let calls = 0;
  let result: RepositoryInfo[] = [];
  do {
    let data: any = await makeGraphql({
      query,
      variables: { after: endCursor },
      token,
    });

    if (calls++ > 20) {
      break;
    }

    if (!Array.isArray(data.viewer.repositories?.edges)) {
      yield result;
      break;
    }

    ({ hasNextPage, endCursor } = data.viewer.repositories.pageInfo);

    result = result.concat(
      data.viewer.repositories.edges
        .map((r: any): RepositoryInfo => {
          return {
            name: r.node?.name,
            owner: r.node?.nameWithOwner?.split('/')[0],
            branch: r.node?.defaultBranchRef?.name,
            description: r.node?.description || '',
          };
        })
        .filter((r: RepositoryInfo) => {
          return r.name && r.owner && r.branch;
        }),
    );
    yield result;
  } while (hasNextPage);
}

/**
 * A higher order function which will provide you a tree data structure of repository.
 * Behind the scenes (implementation details):
 * 1. it will make sure to avoid making multiple calls to the github api,
 *    if the latest commit hash hasn't changed since the last call.
 * 2. it will also make sure to only allow one request at a time to the github api.
 */
export function getRepoTree(): (
  arg: Omit<Parameters<typeof _getTree>[0], 'commitSha'>,
) => Promise<GHTree> {
  let prevResult: undefined | Awaited<ReturnType<typeof _getTree>>;
  let queue = serialExecuteQueue();

  const cb = async (
    arg: Omit<Parameters<typeof _getTree>[0], 'commitSha'>,
  ): ReturnType<typeof _getTree> => {
    const { config, abortSignal } = arg;

    let latestSha: string | undefined;

    if (prevResult) {
      latestSha = await getLatestCommitSha({
        config,
        abortSignal: abortSignal,
        cacheBustValue: Date.now(),
      });

      // if its the same sha as previous call, return the previous result
      if (latestSha === prevResult.sha) {
        console.debug(
          'github-storage:getRepoTree reusing tree from previous call',
          latestSha,
        );

        return prevResult;
      }
    }

    const result = await _getTree({
      ...arg,
      // use the latest commit sha if we have it, otherwise we'll get it from the api
      commitSha: latestSha,
    });

    prevResult = result;

    return result;
  };

  const serialCb: typeof cb = (arg) => {
    return queue.add(() => cb(arg));
  };

  return serialCb;
}

export const serialGetRepoTree = getRepoTree();

async function _getTree({
  abortSignal,
  wsName,
  config,
  commitSha,
}: {
  abortSignal?: AbortSignal;
  wsName: string;
  config: GithubConfig;
  commitSha?: string;
}): Promise<GHTree> {
  const makeRequest = async (
    attempt = 0,
    lastErrorMessage?: string,
  ): Promise<{
    truncated: boolean;
    tree: Array<{ url: string; wsPath: string }>;
    sha: string;
  }> => {
    if (attempt > 3) {
      throw new BaseError({
        message: lastErrorMessage || `Не могу получить дерево для ${wsName}`,
        code: INVALID_GITHUB_RESPONSE,
      });
    }

    try {
      let path = `/repos/${config.owner}/${config.repoName}/git/trees/${
        commitSha || config.branch
      }?recursive=1&cacheBust=${Date.now()}`;

      return (
        await makeV3GetApi({
          path,
          token: config.githubToken,
          abortSignal,
        })
      ).data;
    } catch (error) {
      if (error instanceof Error || error instanceof BaseError) {
        if (error.message.includes('Git Repository is empty.')) {
          let errorMessage = error.message;

          return initializeRepo({ config }).then((sha) => {
            return makeRequest(attempt + 1, errorMessage);
          });
        }
        // this is thrown when repo is initialized but has no files
        if (error.message === 'Not Found') {
          return getLatestCommitSha({ config, abortSignal }).then((sha) => ({
            truncated: false,
            tree: [],
            sha: sha,
          }));
        }
      }
      throw error;
    }
  };

  const { truncated, tree, sha } = await makeRequest(0);

  if (truncated || !tree) {
    throw new BaseError({
      message: 'Github ответ не соответствует требованиям',
      code: INVALID_GITHUB_RESPONSE,
    });
  }

  const list = (tree as any[])
    .filter((t) => {
      return t && t.type === 'blob' && allowedFilePath(t.path);
    })
    .map(
      (t: {
        path: string;
        url: string;
        sha: string;
      }): [string, { url: string; wsPath: string; sha: string }] => {
        const wsPath = wsPathHelpers.fromFsPath(wsName + '/' + t.path);

        // TODO allowedFilePath takes care of this check, should we still do it here?
        if (!wsPath) {
          throw new BaseError({
            message: 'Путь к файлу содердит недопустимые символы :' + t.path,
            code: INVALID_GITHUB_RESPONSE,
          });
        }

        return [
          wsPath,
          {
            url: t.url,
            wsPath,
            sha: t.sha,
          },
        ];
      },
    );

  return {
    sha,
    tree: new Map(list),
  };
}

export async function pushChanges({
  headSha,
  commitMessage,
  additions,
  deletions,
  config,
  abortSignal,
}: {
  abortSignal: AbortSignal;
  headSha: string;
  commitMessage: {
    headline: string;
    body?: string;
  };
  additions: Array<{ path: string; base64Content: string }>;
  deletions: Array<{ path: string }>;
  config: GithubConfig;
}): Promise<void> {
  let query = `
    mutation ($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          url
          oid
        }
      }
    }
  `;

  const makeRequest = () => {
    return makeGraphql({
      query,
      variables: {
        input: {
          expectedHeadOid: headSha,
          branch: {
            branchName: config.branch,
            repositoryNameWithOwner: `${config.owner}/${config.repoName}`,
          },
          message: commitMessage,
          fileChanges: {
            additions: additions.map((r) => ({
              path: r.path,
              contents: r.base64Content,
            })),
            deletions: deletions,
          },
        },
      },
      token: config.githubToken,
    });
  };

  const result = await makeRequest().catch((error) => {
    // try one more time for cases where the headSha has not updated yet
    // on github's side
    if (
      error instanceof BaseError &&
      (error.message.includes(`but expected ${headSha}`) ||
        error.message.includes(`to point to "${headSha}" but it did not`))
    ) {
      console.debug(
        'github-storage:pushChanges retrying after error',
        error.message,
      );

      return sleep(2000).then(() => makeRequest());
    }
    throw error;
  });

  const commitHash = result.createCommitOnBranch?.commit?.oid;

  const { data: result2 } = await makeV3GetApi({
    path: `/repos/${config.owner}/${config.repoName}/commits/${commitHash}`,
    token: config.githubToken,
    abortSignal,
  });

  result2.files.forEach((r: any) => {
    const blobUrl = r.blob_url.split('/');
    const blob = blobUrl[blobUrl.indexOf('blob') + 1];

    if (typeof blob !== 'string' || blob.length !== 40) {
      throw new BaseError({
        message: 'Некоректный github-файл',
        code: INVALID_GITHUB_RESPONSE,
      });
    }
  });
}

/**
 * Returns a file corresponding to the given wsPath from
 * github tree.
 */
export async function getFileBlobFromTree({
  wsPath,
  tree,
  config,
  abortSignal,
}: {
  wsPath: string;
  tree: GHTree;
  config: GithubConfig;
  abortSignal?: AbortSignal;
}): Promise<File | undefined> {
  const match = tree.tree.get(wsPath);

  if (!match) {
    return undefined;
  }

  const { fileName } = wsPathHelpers.resolvePath(wsPath, true);

  return getFileBlob({
    config,
    abortSignal,
    fileBlobUrl: match.url,
    fileName: fileName,
  });
}

export async function getFileBlob({
  fileBlobUrl,
  config,
  fileName,
  abortSignal,
}: {
  fileName: string;
  fileBlobUrl: string;
  config: GithubConfig;
  abortSignal?: AbortSignal;
}): Promise<File> {
  return makeV3GetApi({
    isBlob: true,
    path: fileBlobUrl,
    token: config.githubToken,
    abortSignal,
    headers: {
      Accept: 'application/vnd.github.v3.raw+json',
    },
  }).then((r) => {
    return new File([r.data], fileName);
  });
}

/**
 *
 * @param param0.cacheBustValue - a value that changes when the cache should be busted
 * @returns
 */
export async function getLatestCommitSha({
  config,
  abortSignal,
  cacheBustValue = Date.now(),
}: {
  config: GithubConfig;
  abortSignal?: AbortSignal;
  cacheBustValue?: number;
}): Promise<string> {
  let path = `/repos/${config.owner}/${config.repoName}/commits/${config.branch}?cacheBust=${cacheBustValue}`;

  const makeRequest = async () => {
    return (
      await makeV3GetApi({
        path,
        token: config.githubToken,
        abortSignal,
        headers: {
          Accept: 'application/vnd.github.v3.raw+json',
        },
      })
    ).data;
  };

  let resp;

  try {
    resp = await makeRequest();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Git Repository is empty.')
    ) {
      await initializeRepo({ config });
      resp = await makeRequest();
    } else {
      throw error;
    }
  }

  const sha = resp?.sha;

  if (typeof sha !== 'string') {
    throw new BaseError({
      message: 'Неверный github ответ для getLatestCommitSha',
    });
  }

  return sha;
}

export async function initializeRepo({
  config,
}: {
  config: GithubConfig;
}): Promise<void> {
  const fileContent = `## Добро пожаловать в Дневник.`;
  const filePath = 'привет.md';
  const res = await githubRestFetch({
    path:
      `https://api.github.com/repos/${config.owner}/${config.repoName}/contents/` +
      filePath,
    method: 'PUT',
    token: config.githubToken,
    headers: {
      Accept: 'application/vnd.github.v3.raw+json',
    },
    body: JSON.stringify({
      message: 'Дневник. Первый коммит',
      content: btoa(fileContent),
      branch: config.branch,
    }),
  });

  if (!res.ok) {
    const message = await res.json().then((data) => {
      return data.message;
    });

    if (
      // if the file already exists
      message === 'отсылка уже существует' ||
      // if a file already exists github expects you to provide a sha
      message.includes(`"sha" не поддерживается`) ||
      // this is thrown when repo is initialized but has no files
      message === 'не найдено'
    ) {
      return;
    }

    throw new BaseError({
      message: message,
      code: GITHUB_API_ERROR,
    });
  }
}

export async function hasRepo({
  config,
  abortSignal,
}: {
  config: GithubConfig;
  abortSignal?: AbortSignal;
}) {
  return makeV3GetApi({
    path: `/repos/${config.owner}/${config.repoName}`,
    token: config.githubToken,
    abortSignal,
  }).then(
    () => true,
    (error) => {
      console.log(config.owner, config.repoName);
      console.error(error);

      return false;
    },
  );
}

export async function createRepo({
  config,
  description = 'Создано автоматически в Дневнике',
}: {
  config: GithubConfig;
  description?: string;
}): Promise<void> {
  const res = await githubRestFetch({
    path: `https://api.github.com/user/repos`,
    method: 'POST',
    token: config.githubToken,
    headers: {
      Accept: 'application/vnd.github.v3.raw+json',
    },
    body: JSON.stringify({
      name: config.repoName,
      private: true,
      homepage: `https://${config.owner}.github.io/${config.repoName}/`,
      description: description,
    }),
  });

  if (!res.ok) {
    let message = await res
      .json()
      .then((data) => data.message || data.errors?.[0]?.message)
      .catch(() => 'Неизвестная ошибка');

    throw new BaseError({
      message: message,
      code: GITHUB_API_ERROR,
    });
  }
}

/**
 * Commits the changes to github
 */
export async function commitToGithub({
  additions,
  deletions,
  abortSignal,
  sha,
  config,
}: {
  additions: Array<{ wsPath: string; file: File }>;
  deletions: string[];
  abortSignal: AbortSignal;
  sha: string;
  config: GithubConfig;
}) {
  if (additions.length === 0 && deletions.length === 0) {
    return;
  }

  const { commitBody, commitHeadline } = makeGitCommitMessage(
    additions,
    deletions,
  );

  await pushChanges({
    abortSignal,
    headSha: sha,
    commitMessage: {
      headline: commitHeadline,
      body: commitBody,
    },
    additions: await Promise.all(
      additions.map(async ({ wsPath, file }) => {
        return {
          base64Content: await fileToBase64(file),
          path: wsPathHelpers.resolvePath(wsPath, true).filePath,
        };
      }),
    ),
    deletions: deletions.map((wsPath) => {
      const { filePath } = wsPathHelpers.resolvePath(wsPath, true);

      return { path: filePath };
    }),
    config,
  });
}

function makeGitCommitMessage(
  additions: Array<{ wsPath: string; file: File }>,
  deletions: string[],
) {
  let commitBy =
    typeof window === 'undefined'
      ? 'https:://dnevnik.mobila.name'
      : window.location.host;

  const commitBody = `Коммит создан автоматически ${commitBy} | ${browserInfo}`;

  let commitHeadline = '📚 Дневник: ';

  let firstAddition =
    additions[0] && wsPathHelpers.resolvePath(additions[0].wsPath).fileName;

  let secondAddition =
    additions[1] && wsPathHelpers.resolvePath(additions[1].wsPath).fileName;

  let firstDeletion =
    deletions[0] && wsPathHelpers.resolvePath(deletions[0]).fileName;

  if (firstAddition) {
    commitHeadline += `Обновление ${firstAddition}`;

    if (secondAddition && additions.length === 2) {
      commitHeadline += ` и ${secondAddition}`;
    } else if (additions.length > 2) {
      commitHeadline += ` и ${additions.length - 1} еще`;
    }

    commitHeadline += ';';
  }

  if (firstDeletion) {
    if (commitHeadline.endsWith(';')) {
      commitHeadline += ' ';
    }

    commitHeadline += `Удаление ${firstDeletion}`;

    if (deletions.length > 1) {
      commitHeadline += ` и ${deletions.length - 1} еще`;
    }

    commitHeadline += ';';
  }

  return {
    commitBody,
    commitHeadline,
  };
}

export async function resolveFilesFromGithub<
  R extends { wsPath: string; remoteUrl: string },
>(
  data: R[],
  config: GithubConfig,
  abortSignal: AbortSignal,
): Promise<Array<R & { remoteFile: File }>> {
  const result = await pMap(
    data,
    async (item) => {
      const remoteFile = await getFileBlob({
        fileBlobUrl: item.remoteUrl,
        config,
        abortSignal,
        fileName: wsPathHelpers.resolvePath(item.wsPath, true).fileName,
      });

      if (remoteFile) {
        return {
          ...item,
          remoteFile,
        };
      }

      return undefined;
    },
    {
      concurrency: 5,
      abortSignal,
    },
  );

  return result.filter(
    (item): item is R & { remoteFile: File } => item !== undefined,
  );
}
