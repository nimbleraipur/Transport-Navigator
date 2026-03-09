import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.cache',
  '.expo',
  'dist',
  'web-build',
  'server_dist',
  'static-build',
  '.replit',
  '.config',
  '.local',
  '.upm',
  'generated-icon.png',
  '.breakpoints',
  '.nix',
  'replit.nix',
  'replit_zip_error_log.txt',
  'scripts/push-to-github.ts',
  'expo-env.d.ts',
  'tsconfig.tsbuildinfo',
  '.DS_Store',
  '.env',
  '.env.local',
];

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split('/');
  return IGNORE_PATTERNS.some(pattern => {
    return parts.some(part => part === pattern) || filePath === pattern;
  });
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (shouldIgnore(relativePath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function main() {
  const repoName = 'my-load-24';
  const isPublic = true;

  console.log('Connecting to GitHub...');
  const octokit = await getUncachableGitHubClient();

  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  let repoExists = false;
  try {
    await octokit.repos.get({ owner: user.login, repo: repoName });
    repoExists = true;
    console.log(`Repository ${user.login}/${repoName} already exists.`);
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  if (!repoExists) {
    console.log(`Creating public repository: ${repoName}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'My Load 24 - Transport & Logistics Mobile App (React Native Expo + Express + MongoDB). Customer App, Driver App & Admin Panel.',
      private: !isPublic,
      auto_init: true,
    });
    console.log('Repository created! Waiting for initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const projectDir = process.cwd();
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to push.`);

  const blobs: { path: string; sha: string }[] = [];
  const batchSize = 5;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (filePath) => {
        const fullPath = path.join(projectDir, filePath);
        const content = fs.readFileSync(fullPath);
        const base64Content = content.toString('base64');

        const { data } = await octokit.git.createBlob({
          owner: user.login,
          repo: repoName,
          content: base64Content,
          encoding: 'base64',
        });

        return { path: filePath, sha: data.sha };
      })
    );
    blobs.push(...results);
    console.log(`Uploaded ${Math.min(i + batchSize, files.length)}/${files.length} files...`);
  }

  const tree = blobs.map(blob => ({
    path: blob.path,
    mode: '100644' as const,
    type: 'blob' as const,
    sha: blob.sha,
  }));

  console.log('Creating tree...');
  const { data: treeData } = await octokit.git.createTree({
    owner: user.login,
    repo: repoName,
    tree,
  });

  let parentSha: string | undefined;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
    });
    parentSha = ref.object.sha;
  } catch (e) {}

  console.log('Creating commit...');
  const { data: commitData } = await octokit.git.createCommit({
    owner: user.login,
    repo: repoName,
    message: 'My Load 24 - Complete transport booking system\n\nReact Native Expo mobile app + Express backend + Admin panel\nFeatures: Phone+OTP auth, real-time tracking, vehicle booking, driver management',
    tree: treeData.sha,
    parents: parentSha ? [parentSha] : [],
  });

  try {
    if (parentSha) {
      await octokit.git.updateRef({
        owner: user.login,
        repo: repoName,
        ref: 'heads/main',
        sha: commitData.sha,
        force: true,
      });
    } else {
      await octokit.git.createRef({
        owner: user.login,
        repo: repoName,
        ref: 'refs/heads/main',
        sha: commitData.sha,
      });
    }
  } catch (e) {
    await octokit.git.updateRef({
      owner: user.login,
      repo: repoName,
      ref: 'heads/main',
      sha: commitData.sha,
      force: true,
    });
  }

  console.log(`\n========================================`);
  console.log(`All files pushed to GitHub!`);
  console.log(`Repository: https://github.com/${user.login}/${repoName}`);
  console.log(`========================================`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
