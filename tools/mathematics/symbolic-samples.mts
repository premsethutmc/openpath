import { generate } from "../../packages/mathematics/src/generator";
console.log(
  JSON.stringify(
    ["polynomial", "calculus"].flatMap((family) =>
      Array.from({ length: 512 }, (_, i) =>
        generate(family as "polynomial" | "calculus", i + 1),
      ),
    ),
  ),
);
