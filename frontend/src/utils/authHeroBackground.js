import heroBg from "../assets/auth-bgc.png";

export const authHeroBackgroundStyle = {
  backgroundImage: `
    linear-gradient(
      rgba(0, 0, 0, 0.25),
      rgba(0, 0, 0, 0.55)
    ),
    url(${heroBg})
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
};
