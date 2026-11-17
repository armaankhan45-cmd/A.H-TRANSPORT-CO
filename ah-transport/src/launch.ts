/** Lets the Home tiles open a page and straight into its "new" form. */
let want = false;
export const askNew = () => { want = true; };
export const takeNew = () => { const w = want; want = false; return w; };
