## What changed
<!-- Short description of the change. For endpoints, include the method and URL. -->

## Jira ticket
<!-- e.g. TFC-227 (SVC-02) -->

## How to test
<!-- URLs to open or steps to follow, e.g. http://localhost:5000/api/services/test-consult -->

## Known limitations
<!-- Anything left as a TODO and what it's waiting on. Write "None" if nothing. -->

## Checklist
- [ ] Base branch is correct (FrontTest / BackTest / FinalTest / main)
- [ ] Branch name includes the Jira key (e.g. feature/TFC-227-SVC-02-get-service)
- [ ] Frontend changes: ran `npm run lint` and `npm run build`
- [ ] Backend changes: ran `ruff check .` and tested the endpoint locally
- [ ] New endpoint: added to `backend/README.txt` and `frontend/API_GUIDE.txt`
- [ ] No secrets, passwords, or .env files included