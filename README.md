# GitHub create/update repo(s) secret

Allows you to set or update the value of a workflow [secret](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets) in a single repo or in all your personal repos.

![CI](https://github.com/tspascoal/gh-create-update-secret/workflows/CI/badge.svg) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gh-create-update-secret&metric=alert_status)](https://sonarcloud.io/dashboard?id=gh-create-update-secret) [![NPM](https://img.shields.io/npm/v/gh-create-update-secret)](https://www.npmjs.com/package/gh-create-update-secret)

## Motivation

Workflow secrets are either scoped to a [repository](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-repositories) or to an [organization](https://docs.github.com/en/github/setting-up-and-managing-organizations-and-teams/about-organizations) if you want to share secrets between workflows in different repositories you can either use [organization secrets](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets-for-an-organization) or replicate the same secret in individual repositories.

If you are using personal (non organization) repositories then you are stuck with having independent copies of the secret in all the repos that needs them. And if you want to change the value then you need to replicate the change on all of them.

This utility is meant to allow you so create/update a secret value in all the repositories (**that you own**) in a single call. Or more interestingly update the value of a secret in all the repos that already have a given secret.

So far example if you use secrets to store tokens for third party (or external) services like [sonarcloud](http://sonarcloud.com/) or [NPM](https://www.npmjs.com/) you can use this utility to update the value of all repositories that have a given secret without affecting the ones that do not.

## Pre requirements

* node
* azure-boards-rewrite-links npm package
* a Personal access token (PAT)

The package can be installed (globally) by calling

> npm install -g gh-create-update-secret

Omit -g if you want to install it locally.

You will also need

A [personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token#creating-a-token) with the following scopes:

* repo

Set an environment variable called GH_PAT with the value of the token

In windows use
> set GH_PAT=XXXXXX

In Linux use
> export GH_PAT=XXXXXX

The token is NOT persisted anywhere so you need to set it every time you start a new shell

> Note if you have installed the package locally and not globally you need to make sure that `node_modules/.bin` (relative to install path) is part of path.

## Usage

gh-create-update-secret --secret secretName --value secretValue [--repo repoName] [--update-only] [--set-on-fork]

### Parameters

* **secret** The name of secret to create/update
* **value** Secret value
* **repo** (optional) If you you wish to create/update the secret of a single repo. You can specify a repo in format owner/repo or just repo (and then the owner is assumed of the PAT owner). If you omit this parameter then it will create/update all owned repos. (`update-only` is honored)
* **update-only** (optional flag, default false). Update only on repos that already have the secret. This flag is great when you want to update en masse an existing set of secrets but don't want to add them to repos that do not have them.
* **set-on-fork** (optional flag, default false) Will create/update secrets on forks, otherwise forks are ignored. (only if repo is not specified)'

### Examples

Updates secret the `sonartoken` with value `dummytoken` on repository `octocat/myrepo` only if the secret already exists.

```sh
gh-create-update-secret --secret sonartoken --value "dummytoken" --update-only --repo octocat/myrepo
```
Sets or Updates secret the `sonartoken` with value `dummytoken` on repository `octocat/myrepo`.

```sh
gh-create-update-secret --secret sonartoken --value "dummytoken" --repo octocat/myrepo
```

Updates secret the `sonartoken` with value `dummytoken` on all repositories owned by the user that owns the PAT, but only if the secret already exists.

```sh
gh-create-update-secret --secret sonartoken --value "dummytoken" --update-only
```

Sets or updates the secret `sonartoken` with value `dummytoken` on all repositories owned by the user that owns the PAT.

```sh
gh-create-update-secret --secret sonartoken --value "dummytoken"'
```
