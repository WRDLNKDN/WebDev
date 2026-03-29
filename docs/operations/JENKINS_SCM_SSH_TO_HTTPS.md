# Jenkins: Stop using SSH for Bitbucket (`Unauthorized` / exit 128)

## How you know it’s the job SCM (not the Jenkinsfile)

If the log shows **only** this and **no pipeline stages**:

```text
using credential jenkins_bitbucket_ssh
git fetch ... git@bitbucket.org:kdrp/devtools.git
stderr: Unauthorized
fatal: Could not read from remote repository.
```

Then Jenkins is cloning **Pipeline script from SCM** with **SSH**. That clone
happens **before** any `checkout { }` steps in your `Jenkinsfile*` run. Changing
checkout steps inside the pipeline **does not** fix this first clone.

## Fix (Sandstone / devtools job)

1. Open the job → **Configure**.
2. Under **Pipeline**:
   - **Definition:** _Pipeline script from SCM_
   - **SCM:** _Git_
3. Set **Repository URL** to **HTTPS** (no `git@`):

   `https://bitbucket.org/kdrp/devtools.git`

4. **Credentials:** pick a **Username with password** (or Bitbucket **app
   password**) credential that can read the repo.
   - **Do not** select `jenkins_bitbucket_ssh` here if you are using an HTTPS
     URL.
   - Use the same style of credential as `jenkins-bitbucket.org-rbrunault` (ID
     may differ on your controller; match type to HTTPS).

5. **Branches to build / Branch Specifier:** e.g. `*/develop` or
   `origin/develop`.

6. **Script Path:** must match where the pipeline lives (e.g.
   `Jenkinsfile_sandstone` if that’s what you use).

7. **Save**, then **Build Now** (or scan multibranch if applicable).

## Optional: fix SSH instead (only if you insist on SSH)

- Ensure `jenkins_bitbucket_ssh` is a **SSH Username with private key** (or
  similar) whose **public** key is added to Bitbucket (user **SSH keys** or repo
  **access keys**).
- Ensure the **linux-static-agent** (or whichever node runs checkout) can use
  that credential and reach Bitbucket on port 22.

HTTPS + app password is usually simpler on static agents.

## Related repo files

- `Jenkinsfile_sandstone` — one checkout of **devtools** (workspace root =
  `DEVTOOLS_PATH`; no nested `devtools/` clone).
- `docs/operations/JENKINS_SANDSTONE.md` — Sandstone-specific notes and Git
  Parameter defaults.
