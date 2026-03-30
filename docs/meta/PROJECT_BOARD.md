<!-- GitHub Project Board setup instructions for WRDLNKDN -->

# Project Board

1. Go to your GitHub repository for WRDLNKDN.
2. Click on the 'Projects' tab.
3. Create a new project board (e.g., 'WRDLNKDN Board').
4. Add columns for 'To Do', 'In Progress', and 'Done'.
5. Add issues for features and bugs, and assign them to the board.
6. Add 'NickTheDevOpsGuy' as a collaborator/contributor to the repo and board.

## Automation configuration

Scheduled GitHub Project v2 automations read `GH_PROJECT_OWNER_TYPE`,
`GH_PROJECT_OWNER_LOGIN`, and `GH_PROJECT_NUMBER` from **repository secrets**
first, then repository variables, when `workflow_dispatch` inputs are not used:

- `GH_PROJECT_OWNER_TYPE` - `org` or `user`
- `GH_PROJECT_OWNER_LOGIN` - org login or GitHub username
- `GH_PROJECT_NUMBER` - Project v2 number from the URL

These workflows use that configuration:

- `set-phase1-target-date.yml`
- `sync-estimate-from-size.yml`
- `reassign-in-review-to-creator.yml`
- `reopen-issue-on-done.yml`

For more details, see:
[GitHub Project Boards documentation](https://docs.github.com/en/issues/organizing-your-work-with-project-boards)
