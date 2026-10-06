/**
 * Host half of @local/dsh-pet-balance.
 *
 * The pet reads balances through the Client-facing `account` Remote namespace,
 * which the API remotes assembly already mounts, so this half owns no service
 * and no route. It exists because a bundle row needs an activatable Host
 * package: the row's `index.js` is what the Loader instantiates.
 */
export function apply() {}
