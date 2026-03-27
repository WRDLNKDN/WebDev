<!-- GitHub Project Board setup instructions for WRDLNKDN -->

# Project Board

1. Go to your GitHub repository for WRDLNKDN.
2. Click on the 'Projects' tab.
3. Create a new project board (e.g., 'WRDLNKDN Board').
4. Add columns for 'To Do', 'In Progress', and 'Done'.
5. Add issues for features and bugs, and assign them to the board.
6. Add 'NickTheDevOpsGuy' as a collaborator/contributor to the repo and board.

## Automation Variables

Scheduled GitHub Project automations use these repository variables when manual
workflow inputs are not present:

- `GH_PROJECT_OWNER_TYPE` - `org` or `user`
- `GH_PROJECT_OWNER_LOGIN` - org login or GitHub username
- `GH_PROJECT_NUMBER` - Project v2 number from the URL

These variables support:

- `set-phase1-target-date.yml`
- `sync-estimate-from-size.yml`
- `reassign-in-review-to-creator.yml`

For more details, see:
[GitHub Project Boards documentation](https://docs.github.com/en/issues/organizing-your-work-with-project-boards)
