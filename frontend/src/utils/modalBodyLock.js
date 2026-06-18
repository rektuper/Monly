let lockCount = 0;
let savedScrollY = 0;

const bodyStyleKeys = [
  "overflow",
  "position",
  "top",
  "left",
  "right",
  "width",
];

const previousStyles = {};

export function lockModalBody() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;

    bodyStyleKeys.forEach((key) => {
      previousStyles[key] =
        document.body.style[key];
    });

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  lockCount += 1;
}

export function unlockModalBody() {
  if (lockCount <= 0) {
    lockCount = 0;
    return;
  }

  lockCount -= 1;

  if (lockCount > 0) {
    return;
  }

  bodyStyleKeys.forEach((key) => {
    document.body.style[key] =
      previousStyles[key] || "";
  });

  window.scrollTo(0, savedScrollY);
}
