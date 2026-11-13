/** kid-look@1: the shipped family and demo builds say less and show the child's screens. Test and research builds keep
 *  the full wording (the browser journeys read it), so this is a build choice, set by build-year.mjs. */
declare const OPENPATH_KID: boolean;
export const KID = typeof OPENPATH_KID !== "undefined" && OPENPATH_KID === true;
import SHORT from "../../../content/learning/short-names.v1.json";
const NAMES = (SHORT as { names: Record<string, string> }).names;
/** kid-look@1: a skill's short name for a child (content/learning/short-names.v1.json); the full name elsewhere */
export const kidName = (competency: string | undefined, full: string): string => (KID && competency && NAMES[competency]) || full;
