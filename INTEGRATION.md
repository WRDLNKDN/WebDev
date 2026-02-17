# GoDaddy and Vercel Integration Instructions

[← Docs index](./docs/README.md)

## Frontend (GoDaddy)

1. Build your frontend (HTML/CSS/JS) in the `frontend` folder.
2. Upload the static files (e.g., `index.html`, `styles.css`, `app.js`) to your
   GoDaddy website hosting via the GoDaddy dashboard or FTP.

## Backend (Vercel)

1. Place your backend/serverless API code in the `backend` folder.
2. Connect the `backend` folder to a new Vercel project
   (<https://vercel.com/import/git>).
3. Deploy and use the provided API endpoints in your frontend code.

## Example

- Your GoDaddy site can make AJAX/fetch requests to your Vercel backend
  endpoints for dynamic features.

---

For more details, see the README files in each subfolder.
