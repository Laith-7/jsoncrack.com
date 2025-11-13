import React, { useState } from "react";
import type { CustomNodeProps } from ".";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";
import type { NodeData } from "../../../../../types/graph";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";
import EditableNode from "./EditableNode"; // ✅ added import

type RowProps = {
    row: NodeData["text"][number];
    x: number;
    y: number;
    index: number;
};

const Row = ({ row, x, y, index }: RowProps) => {
    const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

    const getRowText = () => {
        if (row.type === "object") return `{${row.childrenCount ?? 0} keys}`;
        if (row.type === "array") return `[${row.childrenCount ?? 0} items]`;
        return row.value;
    };

    // ✅ this hook must be *inside* the Row function, not before return
    const [value, setValue] = useState(getRowText());

    return (
        <Styled.StyledRow
            $value={row.value}
            data-key={`${row.key}: ${row.value}`}
            data-x={x}
            data-y={y + rowPosition}
        >
            <Styled.StyledKey $type="object">{row.key}: </Styled.StyledKey>

            {/* ✅ EditableNode replaces TextRenderer */}
            <EditableNode
                value={value}
                onSave={(newValue) => {
                    setValue(newValue);
                    row.value = newValue;
                    // TODO: Connect to JSON store for syncing editor later
                }}
            />
        </Styled.StyledRow>
    );
};

const Node = ({ node, x, y }: CustomNodeProps) => (
    <Styled.StyledForeignObject
        data-id={`node-${node.id}`}
        width={node.width}
        height={node.height}
        x={0}
        y={0}
        $isObject
    >
        {node.text.map((row, index) => (
            <Row key={`${node.id}-${index}`} row={row} x={x} y={y} index={index} />
        ))}
    </Styled.StyledForeignObject>
);

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
    return (
        JSON.stringify(prev.node.text) === JSON.stringify(next.node.text) &&
        prev.node.width === next.node.width
    );
}

export const ObjectNode = React.memo(Node, propsAreEqual);
