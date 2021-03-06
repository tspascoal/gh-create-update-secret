#!/usr/bin/env node

import { Octokit } from "@octokit/rest"

import { seal } from "tweetsodium"

import Colors = require('colors/safe');
import yargs = require('yargs');

async function setOrUpdateRepoSecret(octokit: Octokit, owner: string, repo: string, secretName: string, secretValue: string, updateOnly: boolean) {

    if (updateOnly) {
        const secret = await octokit.actions.getRepoSecret({
            "owner": owner,
            "repo": repo,
            "secret_name": secretName
        }).catch((error) => {

            if (error.status == 404) {
                console.log(`${Colors.yellow("Skipped")} ${owner}/${repo} does not contain secret ${secretName}`)
            } else {
                console.log(`${Colors.red("Error")} getting secret ${secretName} from ${owner}/${repo}, check PAT scope ${error.status}`)
            }
            return
        })

        if (!secret) return;
    }

    const publicKey = await octokit.actions.getRepoPublicKey({
        "owner": owner,
        "repo": repo
    }).catch((error) => {

        if (error.status == 404) {
            console.log(`${Colors.red("Error")} ${owner}/${repo} repo does not exit`)
        } else {
            console.log(`${Colors.red("Error")} ${error}`)
        }
    })

    if (!publicKey) return;

    // Encrypt secret
    const messageBytes = Buffer.from(secretValue);
    const keyBytes = Buffer.from(publicKey.data.key, 'base64');
    const encryptedBytes = seal(messageBytes, keyBytes);

    // Base64 the encrypted secret
    const encryptedSecretValue = Buffer.from(encryptedBytes).toString('base64');

    await octokit.actions.createOrUpdateRepoSecret({
        "owner": owner,
        "repo": repo,
        "secret_name": secretName,
        "encrypted_value": encryptedSecretValue,
        "key_id": publicKey.data.key_id
    }).catch((error) => {
        console.log(`${Colors.red("Error")} updating or created secret in ${owner}/${repo} with error ${error}`)
    })

    console.log(`${Colors.green("Updated")} secret ${secretName} on ${owner}/${repo}`)
}

async function getUserLoginExitOnFail(octokit: Octokit) : Promise<string> {
    const authuser = await octokit.users.getAuthenticated()
    .catch(error => {
        if (error.status == 401) {
            console.log(`${Colors.red("Error")} can't get logged user. Check PAT`)
        } else if (error.status == 403) {
            console.log(`${Colors.red("Error")} can't get logged user. Missing user scope?`)
        } else {
            console.log(`${Colors.red("Error")} could not get authenticated user: ${error.status}`)
        }
        process.exit(-4)
    })
    
    return authuser.data.login
}

export async function run(repo: string, secretName: string, secretValue: string, updateOnly: boolean, setOnFork: boolean): Promise<void> {

    const octokit = new Octokit({
        auth: process.env["GH_PAT"]
    })

    let owner : string

    if (repo) {

        if (repo.indexOf("/") !== -1) {
            const parts = repo.split("/")

            if (parts.length != 2) {
                console.log(`${Colors.red("Error")} repo must be in format owner/repo`)
                process.exit(-2)
            }

            owner = parts[0]
            repo = parts[1]
        } else {
            owner = await getUserLoginExitOnFail(octokit)
        }

        console.log(`checking if ${owner}/${repo} exists`)
        await octokit.repos.get({
            "owner": owner,
            "repo": repo
        }).catch(error => {
            console.log(`${Colors.red("Error")} ${owner}/${repo} repo does not exit or you do not have permission. Error Message: ${error}`)
        }).then(async () => {
            await setOrUpdateRepoSecret(octokit, owner, repo, secretName, secretValue, updateOnly)
        })
    } else {

        owner = await getUserLoginExitOnFail(octokit)

        console.log(`Getting repositories for which ${owner} is owner`)

        octokit.paginate(octokit.repos.listForAuthenticatedUser, {
            "affiliation": "owner",
            "visibility": "all",
            "headers": {
                "accept": "application/vnd.github.nebula-preview+json"
            }
        }).then(async (repos) => {
            for (let x = 0; x < repos.length; x++) {
                const repoName = repos[x].name
                const isFork = repos[x].fork

                if (isFork && setOnFork === false) {
                    console.log(`${Colors.yellow("Skipped")} ${owner}/${repoName} is a fork`)
                } else {
                    await setOrUpdateRepoSecret(octokit, owner, repoName, secretName, secretValue, updateOnly)
                }
            }
        })
    }
}

///////////////////////////////////////////////////// main

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const argv: any = yargs.options({})
    .usage('Usage: $0 --secret secretName --value secretValue [--repo repoName] [--update-only] [--set-on-fork]')
    .demandOption(['secret', 'value'])
    .example('$0 --secret sonartoken --value "dummytoken" --update-only --repo octocat/myrepo', 'Set/Update sonartoken repo secret on octocat/myRepo repository')
    .example('$0 --secret sonartoken --value "dummytoken" --update-only', 'Updates sonartoken secret on all (non forked) owned repos that already have sonartoken secret defined')
    .example('$0 --secret sonartoken --value "dummytoken"', 'set/update sonartoken secret on all (non forked) owned repos')
    .option('repo', {
        description: "If you you wish to set/update the secret of a single repo. You can specify a repo in format owner/repo or just repo (and then the owner is assumed of the PAT owner)"
    })
    .option('secret', {
        type: 'string',
        description: "Secret name you wish to set/update"
    })
    .option('value', {
        type: 'string',
        description: 'Secret Value'
    })
    .option('update-only', {
        type: 'boolean',
        default: false,
        description: 'Update only if secret already exists (otherwise repo is ignored'
    })
    .option('set-on-fork', {
        type: 'boolean',
        default: false,
        description: 'Will set/update secrets on fork, otherwise forks are ignored. (only if repo is not specified)'
    })
    .parserConfiguration({
        "parse-numbers": false
    })
    .epilog('Note: You need to set an environment variabled name GH_PAT with a personal access token')
    .argv;

if (process.env["GH_PAT"] == null) {
    console.error("You need to define an environment variable called GH_PAT with your Personal access token")
    process.exit(-3);
}

run(argv.repo, argv.secret, argv.value, argv['update-only'], argv['set-on-fork'])