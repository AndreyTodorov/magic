# Branch Protection Setup

To ensure tests must pass before merging, configure branch protection rules in your GitHub repository.

## Steps to Configure

1. **Navigate to Settings**
   - Go to your repository on GitHub
   - Click **Settings** → **Branches**

2. **Add Branch Protection Rule**
   - Click **Add rule** or **Add branch protection rule**
   - Branch name pattern: `main` (or `develop` for your dev branch)

3. **Configure Protection Settings**

   ✅ **Require status checks before merging**
   - Enable: `Require status checks to pass before merging`
   - Search and select: `Run Tests` (the job name from test.yml)
   - Enable: `Require branches to be up to date before merging` (optional but recommended)

   ✅ **Require pull request reviews** (optional)
   - Enable: `Require a pull request before merging`
   - Set: `Required approvals: 1` (adjust based on team size)

   ✅ **Other recommended settings**
   - Enable: `Do not allow bypassing the above settings` (enforces rules for admins too)
   - Enable: `Require conversation resolution before merging` (optional)
   - Enable: `Require linear history` (optional, keeps commit history clean)

4. **Save Changes**
   - Click **Create** or **Save changes**

## What This Does

- ✅ **Blocks merging** if tests fail
- ✅ **Requires CI checks** to pass on all PRs
- ✅ **Prevents force pushes** to protected branches
- ✅ **Ensures code quality** before it reaches main branch

## Testing the Setup

1. Create a test branch: `git checkout -b test/branch-protection`
2. Make a change that breaks tests
3. Push and create a PR
4. Verify that GitHub blocks merging until tests pass
5. Fix the tests and verify merge is allowed

## Additional Actions (Optional)

### Add a Status Badge to README

Add this to your [README.md](../../README.md):

```markdown
[![Tests](https://github.com/YOUR_USERNAME/magic/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/magic/actions/workflows/test.yml)
```

Replace `YOUR_USERNAME` with your GitHub username.

### Set Up Codecov (Optional)

For detailed coverage reports:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Copy the Codecov token
4. Add it to GitHub Secrets:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `CODECOV_TOKEN`
   - Value: (paste your token)

This will enable coverage reports on PRs automatically.
