# Educator access (educator-access@1)

An administrator gives an existing account the educator role, or removes it, in the app: **Content review → Educator access** (`/review/`). Until now this needed `manage.py content_reviewer grant|revoke`, which still works the same way.

## What is reused

- **The role:** the existing `ContentReviewer` grant (`role="educator"`). It is the same row the management command writes, and there is no migration.
- **Marking:** the existing marking screen and API (`written.py`: `/written/queue/`, `/written/marks/`, the parent's marking share) are unchanged. They already read that grant, so a removal takes effect on the educator's next request.
- **Audit:** the existing `DiagnosticAccessLog`. Actions are `educator-grant` and `educator-revoke`, and the detail is the account id, never the email.

## Who can grant

- Only an active Django superuser can grant. The app never sets that flag; registration uses `create_user`. Only the server operator can set it, in one of two ways:

  ```
  python manage.py createsuperuser                      # a new administrator account
  python manage.py shell -c "from django.contrib.auth import get_user_model as g; g().objects.filter(username='admin@example.org').update(is_superuser=True)"
  ```

- These people cannot grant or remove roles, and the API returns 403 to them:
  - parents (learners have no account of their own; their pupils belong to a parent's account);
  - educators;
  - release managers;
  - developers;
  - `is_staff` accounts;
  - deactivated administrators.
- Signed-out requests are refused.
- The tab appears only when `/content-review/` reports `canManageEducators`.
- Only the educator role is managed here. The release-manager role stays command-line only.

## What an administrator sees

- The administrator sees the list of educator grants: account email, active or removed, and the date.
- They see no pupils, answers or marks.
- Being an administrator does not by itself open the marking queue (403).
- Granting needs a registered, active account. An unknown email gets "No OpenPath account uses that email".

## API

- **`/api/educator-access/`**
  - `GET` lists the grants.
  - `POST {email}` grants the role (201).
  - `DELETE {email}` removes it (204; 400 if the account has no active grant).

## Tests

- **`backend/family/test_educator_access.py`** checks:
  - grant, removal and re-grant (one row, audited);
  - that only existing, active accounts can be granted;
  - that parents, educators, release managers, staff, signed-out requests and a deactivated administrator are refused;
  - that a granted educator reaches the existing marking queue, still under a pseudonym, and loses it, and the ability to mark, on removal.
- **`frontend/e2e/educator-access.test.mjs`** runs the same flow in the browser against real Django:
  - a parent has no tab and gets 403;
  - the administrator grants the role and an unknown email is refused;
  - the educator opens Marking;
  - the administrator removes the role and Marking closes.
  - Screenshots are in `screens/`.

## Still open

- The parent must still know the educator's email to share written work.
- There is no invite or self-service request: the educator registers first, then an administrator grants the role.
