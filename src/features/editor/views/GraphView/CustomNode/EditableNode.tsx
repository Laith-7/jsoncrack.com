import React, { useState } from "react";

interface EditableNodeProps {
    value: string;
    onSave: (newValue: string) => void;
}

const EditableNode: React.FC<EditableNodeProps> = ({ value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const handleSave = () => {
        onSave(tempValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempValue(value);
        setIsEditing(false);
    };

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {isEditing ? (
                <>
                    <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        style={{ width: "80px" }}
                    />
                    <button onClick={handleSave}>💾</button>
                    <button onClick={handleCancel}>❌</button>
                </>
            ) : (
                <>
                    <span>{value}</span>
                    <button
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                        }}
                        onClick={() => setIsEditing(true)}
                    >
                        ✏️
                    </button>
                </>
            )}
        </span>
    );
};

export default EditableNode;
