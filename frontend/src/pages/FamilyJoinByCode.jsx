import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FamilyInviteModal from "../components/family/FamilyInviteModal";

function FamilyJoinByCode() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="family-join-page">
      <FamilyInviteModal
        accessCode={code}
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

export default FamilyJoinByCode;
