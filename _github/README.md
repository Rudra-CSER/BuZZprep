# Move this folder to `.github`

These are the GitHub Actions CI workflow and issue templates. They are delivered here because
remote tools can't write into `.github` directly. To enable them:

```bash
mv _github .github && rm .github/README.md
```

`workflows/ci.yml` checks formatting, types and lint, runs all tests (including the API
integration tests against a MongoDB service) and builds the app and the Docker image on every
push to `main` and every pull request. Review it before enabling.
