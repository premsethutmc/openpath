/** kid-look@1: the shipped family and demo builds say less and show the child's screens. Test and research builds keep
 *  the full wording (the browser journeys read it), so this is a build choice, set by build-year.mjs. */
declare const OPENPATH_KID: boolean;
export const KID = typeof OPENPATH_KID !== "undefined" && OPENPATH_KID === true;
