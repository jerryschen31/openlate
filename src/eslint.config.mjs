import nextVitals from "eslint-config-next/core-web-vitals"

const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
]

export default eslintConfig
