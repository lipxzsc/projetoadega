<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep public store identity and page metadata in `src/lib/brand.ts`, with artwork loaded through the asset pointer; this keeps branding consistent without exposing credentials.
- Public storefront labels use the centralized brand rather than the persisted settings name; legal business identity and operational settings remain unchanged during visual rebrands.
- Derive the public favicon from the same brand symbol used in the interface, so browser tabs and store branding stay consistent.
- Keep public order tracking fields in an explicit allowlist; customer identity, address and coordinates belong only in authorized operational views.
