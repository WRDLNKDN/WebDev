# Sandstone Jenkins (CI-AutoBuilds)

## Fix: `Unauthorized` / `Could not read from remote repository` (status 128)

If the log says **`using credential jenkins_bitbucket_ssh`** and
**`git@bitbucket.org:kdrp/devtools.git`**, the failure is the **job’s Git SCM**
(the clone that loads the Jenkinsfile), not the `Checkout Devtools` stage inside
the script. **Change the job to HTTPS + a username/app-password credential** —
see **[JENKINS_SCM_SSH_TO_HTTPS.md](./JENKINS_SCM_SSH_TO_HTTPS.md)**.

Bitbucket over **SSH** (`git@bitbucket.org:…`) requires SSH keys on the
**Jenkins agent**. If the agent only has **HTTPS credentials** (e.g.
`jenkins-bitbucket.org-rbrunault`), use **HTTPS** everywhere.

### Pipeline job: “Pipeline script from SCM”

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Repository URL**   | `https://bitbucket.org/kdrp/devtools.git`                                          |
| **Credentials**      | `jenkins-bitbucket.org-rbrunault` (username + app password / token with repo read) |
| **Branch Specifier** | `origin/develop` or `*/develop` (not SSH URL)                                      |

Do **not** use `git@bitbucket.org:kdrp/devtools.git` unless every agent has a
deploy key or SSH credential wired for that repo.

### Multibranch / other jobs

Same rule: SCM URL must match the credential type (HTTPS URL + username/password
or token).

## Git Parameter (`BRANCH_NAME`)

The `Jenkinsfile_sandstone` defines:

- **Default:** `origin/develop`
- **Filter:**
  `origin/(develop|main|master|release/.*|hotfix/.*|feature/.*|sandbox/.*)`  
  Widen the regex in the Jenkinsfile if your team uses other naming patterns.

## In-repo checkout (`Checkout Devtools` stage)

The pipeline checks out **devtools** again with:

- URL: `https://bitbucket.org/kdrp/devtools.git`
- Credentials: `jenkins-bitbucket.org-rbrunault`

This matches the Jenkinsfile in this repository; redeploy/update the job script
from SCM after merging.
