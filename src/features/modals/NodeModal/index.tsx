import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Textarea,
  TextInput,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setJson = useJson(state => state.setJson);
  const setContents = useFile(state => state.setContents);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editingValue, setEditingValue] = React.useState("");
  const [editingFields, setEditingFields] = React.useState<Record<string, string>>({});

  const refreshDisplay = React.useCallback(() => {
    if (!nodeData) {
      setEditingValue("");
      setEditingFields({});
      return;
    }
    // refresh displayed content with current nodeData
    setEditingValue(normalizeNodeData(nodeData.text ?? []));
    const keyed = nodeData?.text?.filter(r => r.key !== null) ?? [];
    const fields: Record<string, string> = {};
    keyed.forEach(r => {
      fields[r.key as string] =
        r.value === null || typeof r.value === "undefined" ? "" : String(r.value);
    });
    setEditingFields(fields);
  }, [nodeData]);

  React.useEffect(() => {
    refreshDisplay();
    setIsEditing(false);
  }, [nodeData, refreshDisplay]);

  // central close handler to reset local edit state before closing
  const handleClose = () => {
    setIsEditing(false);
    onClose && onClose();
  };

  const setValueAtPath = (obj: any, path: NodeData["path"] | undefined, value: any) => {
    if (!path || path.length === 0) return value; // replace root

    // clone top-level appropriately
    const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
    let cur: any = cloned;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i] as any;
      // ensure intermediate nodes exist (preserve arrays/objects if present)
      if (typeof key === "number") {
        cur[key] = cur[key] ?? {};
      } else {
        cur[key] = cur[key] ?? {};
      }
      cur = cur[key];
    }

    const last = path[path.length - 1] as any;
    cur[last] = value;
    return cloned;
  };

  const handleSave = () => {
    if (!nodeData) return;

    try {
      const current = useJson.getState().getJson();

      const keyed = nodeData?.text?.filter(r => r.key !== null) ?? [];
      let newValue: any;
      if (keyed.length > 0) {
        newValue = {} as Record<string, any>;
        for (const k of Object.keys(editingFields)) {
          const raw = editingFields[k];
          try {
            newValue[k] = JSON.parse(raw);
          } catch (e) {
            newValue[k] = raw;
          }
        }
      } else {
        try {
          newValue = JSON.parse(editingValue);
        } catch (e) {
          newValue = editingValue;
        }
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(current);
      } catch (e) {
        console.warn("Could not parse current json", e);
        return;
      }

      // use setValueAtPath (simpler, more reliable)
      const updated = setValueAtPath(parsed, nodeData.path, newValue);
      const updatedJson = JSON.stringify(updated, null, 2);

      // update both stores: useJson (for graph) and useFile (for text editor)
      setJson(updatedJson);
      setContents({ contents: updatedJson, hasChanges: false, skipUpdate: true });

      // close modal after save so it reopens fresh with updated data
      handleClose();
    } catch (err) {
      console.error("Error saving node edit:", err);
    }
  };

  const handleCancel = () => {
    // cancel editing or close modal
    if (isEditing) {
      setEditingValue(nodeData ? normalizeNodeData(nodeData.text ?? []) : "");
      setEditingFields(prev => ({ ...prev })); // no change, just keep values or reset via refreshDisplay
      setIsEditing(false);
      return;
    }

    handleClose();
  };

  return (
    <Modal size="auto" opened={opened} onClose={handleClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="8px" align="center">
              {!isEditing ? (
                <Button
                  size="xs"
                  color="blue"
                  onClick={() => {
                    // ensure displayed editing values are current before toggling edit mode
                    refreshDisplay();
                    setIsEditing(true);
                  }}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" color="red" variant="default" onClick={() => handleCancel()}>
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={handleClose} />
            </Flex>
          </Flex>
          <ScrollArea.Autosize mah={300} maw={600}>
            {isEditing ? (
              Object.keys(editingFields).length > 0 ? (
                <Stack gap="md">
                  {Object.entries(editingFields).map(([key, value]) => (
                    <TextInput
                      key={key}
                      label={key}
                      value={value}
                      onChange={e =>
                        setEditingFields(prev => ({ ...prev, [key]: e.currentTarget.value }))
                      }
                      miw={350}
                    />
                  ))}
                </Stack>
              ) : (
                <Textarea
                  minRows={6}
                  autosize
                  value={editingValue}
                  onChange={e => setEditingValue(e.currentTarget.value)}
                  miw={350}
                  maw={600}
                />
              )
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};