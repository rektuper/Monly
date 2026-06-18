import { FiUser } from "react-icons/fi";

import { resolveMediaUrl } from "../../utils/mediaUrl";

import "../../styles/shared/UserAvatar.css";

function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  className = "",
  cacheBust,
}) {
  const resolved = resolveMediaUrl(avatarUrl, cacheBust);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <span
      className={`user-avatar ${className}`}
      style={{ width: size, height: size }}
      title={name || ""}
    >
      {resolved ? (
        <img src={resolved} alt="" />
      ) : (
        <span className="user-avatar-fallback">
          {initial || <FiUser />}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
