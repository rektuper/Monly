import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FamilyInviteModal from "../components/family/FamilyInviteModal";

function FamilyJoin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="family-join-page">
    <FamilyInviteModal
      token={token}
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        navigate("/family");
      }}
      onJoined={() => navigate("/family")}
    />
    </div>
  );
}

export default FamilyJoin;
