# Feed “Post” and “Link” buttons

When the Feed page exists, the **Start a post** area has two actions:

## Intended behavior

- **Post** — Submit the text in the composer as a new **post** feed item.
  - On click: read the current value from the “Start a post” input, call the
    create-post API (e.g. `POST /api/feeds` or insert into `feed_items` with
    `kind: 'post'`), then clear the input and refresh the feed (or
    optimistically add the item).
- **Link** — Add an **external link** feed item (URL + optional label).
  - On click: open a small dialog or inline form for URL (and optional label),
    then call the API to create an item with `kind: 'external_link'` and
    `payload: { url, label? }`. No fetching or scraping of the URL.

## Until the API exists

- **Post** and **Link** can focus the composer input and/or show a Snackbar
  (e.g. “Create post — coming soon”) so the buttons are visible and do
  something.
- When the backend supports creating feed items, wire **Post** to the
  post-creation endpoint and **Link** to the link-creation flow (dialog +
  endpoint).

## Tech notes

- Use MUI `Button` with `variant="text"` and subtle hover
  (`bgcolor: 'action.hover'`) so they don’t look like primary actions.
- Keep navigation and other links as MUI `Link` with
  `component={RouterLink} to="..."` so client-side routing works.
