import { useState, useEffect, useRef } from "react";
import { Button } from "./components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sha256 } from "js-sha256";
import { Textarea } from "@/components/ui/textarea";
import { z, ZodError } from "zod";

interface Item {
  quantity: number;
  tags: string[];
}

interface Version {
  items: Map<string, Item>;
  previousVersion: string | null;
  timestamp: string;
}

function objectToItems(o: any): Map<string, Item> {
  return new Map(Object.entries(o));
}

function objectToVersion(o: any): Version {
  return {
    items: objectToItems(o.items),
    previousVersion: o.previousVersion,
    timestamp: o.timestamp,
  };
}

function itemsToObject(items: Map<string, Item>): Object {
  return Object.fromEntries(items.entries());
}

function versionToObject(v: Version): any {
  return {
    items: itemsToObject(v.items),
    previousVersion: v.previousVersion,
    timestamp: v.timestamp,
  };
}

function stringToVersion(s: string): Version {
  return objectToVersion(JSON.parse(s));
}

function versionToString(v: Version): string {
  return JSON.stringify(versionToObject(v));
}

function commaSeparatedToArray(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const CURRENT_SHA_KEY = "current-sha";
const VERSION_KEY_PREFIX = "data-version-";

function getOrCreateCurrentVersion(): [Version, string] {
  initLocalStorage();
  const currentSha = localStorage.getItem(CURRENT_SHA_KEY)!;
  const currentVersionRaw = localStorage.getItem(
    VERSION_KEY_PREFIX + currentSha
  )!;
  const currentVersion = stringToVersion(currentVersionRaw);
  return [currentVersion, currentSha];
}

function ItemDisplayRow({
  onEdit,
  onDelete,
  name,
  item,
}: {
  onEdit: () => void;
  onDelete: (itemName: string) => void;
  name: string;
  item: Item;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell>{item.quantity}</TableCell>
      <TableCell>
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="inline-block rounded-full bg-chart-3 py-1 px-2 m-1 text-primary-foreground"
          >
            {tag}
          </span>
        ))}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Button onClick={onEdit}>Edit</Button>
        <Button onClick={() => onDelete(name)} className="ml-2">
          Delete
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ItemRow({
  onDelete,
  onSave,
  name,
  item,
}: {
  onDelete: (itemName: string) => void;
  onSave: (
    originalItemName: string,
    newItemName: string,
    item: Item
  ) => boolean;
  name: string;
  item: Item;
}) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  if (isEditing) {
    return (
      <ItemInputRow
        initialItemName={name}
        initialItemQuantity={item.quantity}
        initialItemTags={item.tags}
        onSave={(newItemName, item) => {
          if (onSave(name, newItemName, item)) {
            setIsEditing(false);
          }
        }}
        onCancel={() => {
          setIsEditing(false);
        }}
      />
    );
  } else {
    return (
      <ItemDisplayRow
        onEdit={() => {
          setIsEditing(true);
        }}
        onDelete={onDelete}
        name={name}
        item={item}
      />
    );
  }
}

function getItemRows({
  items,
  onDelete,
  onSave,
}: {
  items: Map<string, Item>;
  onDelete: (itemName: string) => void;
  onSave: (
    originalItemName: string,
    newItemName: string,
    item: Item
  ) => boolean;
}) {
  const tableRows = Array.from(items.entries())
    .sort(([name1, _item1], [name2, _item2]) => name1.localeCompare(name2))
    .map(([name, item]) => (
      <ItemRow
        key={name}
        onSave={onSave}
        onDelete={onDelete}
        name={name}
        item={item}
      />
    ));
  return tableRows;
}

function getAllVersions(): Map<string, Version> {
  return new Map(
    Object.entries(localStorage).flatMap(([k, v]: [string, string]) => {
      if (k.startsWith(VERSION_KEY_PREFIX)) {
        return [[k, stringToVersion(v)]];
      } else {
        return [];
      }
    })
  );
}

function makeVersion(
  items: Map<string, Item>,
  previousVersion: string | null
): Version {
  return {
    items: items,
    previousVersion: previousVersion,
    timestamp: new Date().toISOString(),
  };
}

function makeExampleVersion(): Version {
  return makeVersion(
    new Map<string, Item>([
      [
        "Example Item",
        { quantity: 2, tags: ["example tag", "another example tag"] },
      ],
      ["Example Item #2", { quantity: 20, tags: ["example tag"] }],
    ]),
    null
  );
}

function writeVersionToLocalStorage(v: Version): void {
  const versionString = versionToString(v);
  const hash = sha256(versionString);
  localStorage.setItem(VERSION_KEY_PREFIX + hash, versionString);
  localStorage.setItem(CURRENT_SHA_KEY, hash);
}

function initLocalStorage(): void {
  const allVersions = getAllVersions();
  if (allVersions.size == 0) {
    writeVersionToLocalStorage(makeExampleVersion());
    initLocalStorage();
    return;
  }
  const currentSha = localStorage.getItem(CURRENT_SHA_KEY);
  if (
    currentSha == null ||
    localStorage.getItem(VERSION_KEY_PREFIX + currentSha) == null
  ) {
    // if current SHA does not exist or points to a non-existent version
    // set it to the version with the latest timestamp
    localStorage.setItem(
      CURRENT_SHA_KEY,
      Array.from(allVersions.entries())
        .sort(
          ([_k1, v1], [_k2, v2]) =>
            Date.parse(v1.timestamp) - Date.parse(v2.timestamp)
        )[0][0]
        .slice(VERSION_KEY_PREFIX.length)
    );
  }
}

function ItemInputRow({
  initialItemName,
  initialItemQuantity,
  initialItemTags,
  onSave,
  onCancel,
}: {
  initialItemName: string;
  initialItemQuantity: number;
  initialItemTags: string[];
  onSave: (itemName: string, item: Item) => void;
  onCancel: () => void;
}) {
  const [itemName, setItemName] = useState<string>(initialItemName);
  const [itemQuantity, setItemQuantity] = useState<string>(
    initialItemQuantity.toString()
  );
  const itemNameRef = useRef<HTMLInputElement>(null);
  const [itemTags, setItemTags] = useState<string>(initialItemTags.join(", "));
  useEffect(() => {
    itemNameRef.current?.focus();
  }, []);
  const getItem: () => Item = () => {
    const q = Number.parseInt(itemQuantity);
    return { quantity: q >= 0 ? q : 1, tags: commaSeparatedToArray(itemTags) };
  };
  const saveItem = () => {
    onSave(itemName, getItem());
  };
  const listenForEnter = (e: any) => {
    if (e.key == "Enter") {
      saveItem();
    }
  };
  return (
    <TableRow>
      <TableCell>
        <Input
          type="text"
          placeholder="Item name"
          value={itemName}
          onChange={(e) => {
            setItemName(e.target.value);
          }}
          onKeyUp={listenForEnter}
          ref={itemNameRef}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          placeholder="Quantity"
          value={itemQuantity}
          onChange={(e) => {
            setItemQuantity(e.target.value);
          }}
          onKeyUp={listenForEnter}
        />
      </TableCell>
      <TableCell>
        <Input
          type="text"
          placeholder="Tags (separated by commas)"
          value={itemTags}
          onChange={(e) => {
            setItemTags(e.target.value);
          }}
          onKeyUp={listenForEnter}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Button
          disabled={(() => {
            const item = getItem();
            return (
              itemName == initialItemName &&
              item.quantity == initialItemQuantity &&
              JSON.stringify(item.tags) == JSON.stringify(initialItemTags)
            );
          })()}
          onClick={saveItem}
        >
          Save
        </Button>
        <Button onClick={onCancel} className="ml-2">
          Cancel
        </Button>
      </TableCell>
    </TableRow>
  );
}

function writeItemToLocalStorage(
  originalItemName: string | null,
  newItemName: string,
  item: Item
): boolean {
  const [currentVersion, currentSha] = getOrCreateCurrentVersion();
  const currentItems = currentVersion.items;
  if (currentItems.has(newItemName) && newItemName != originalItemName) {
    alert(`Item with name "${newItemName}" already exists.`);
    return false;
  } else if (newItemName.length == 0) {
    alert("Item name cannot be empty.");
    return false;
  }
  if (originalItemName != null) {
    currentItems.delete(originalItemName);
  }
  currentItems.set(newItemName, item);
  writeVersionToLocalStorage(makeVersion(currentItems, currentSha));
  return true;
}

function deleteItemFromLocalStorage(name: string) {
  const [currentVersion, currentSha] = getOrCreateCurrentVersion();
  const currentItems = currentVersion.items;
  currentItems.delete(name);
  writeVersionToLocalStorage(makeVersion(currentItems, currentSha));
}

function writeItemsToLocalStorage(items: Map<string, Item>): void {
  const [_currentVersion, currentSha] = getOrCreateCurrentVersion();
  writeVersionToLocalStorage(makeVersion(items, currentSha));
}

interface JsonParseOk {
  kind: "ok";
  items: Map<string, Item>;
}

interface JsonParseError {
  kind: "error";
  msg: string;
}

type JsonParseResult = JsonParseOk | JsonParseError;

function parseJson(json: string): JsonParseResult {
  try {
    const obj = JSON.parse(json);
    const schema = z.record(
      z.string(),
      z.object({
        quantity: z.number(),
        tags: z.array(z.string()),
      })
    );
    return { kind: "ok", items: objectToItems(schema.parse(obj)) };
  } catch (e: any) {
    if (e instanceof ZodError) {
      return {
        kind: "error",
        msg: `JSON schema errors: ${e}`,
      };
    }
    return { kind: "error", msg: e.toString() };
  }
}

function JsonMode({
  initJson,
  onSave,
  onCancel,
}: {
  initJson: string;
  onSave: (items: Map<string, Item>) => void;
  onCancel: () => void;
}) {
  const [json, setJson] = useState<string>(initJson);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <>
      <div className="flex m-2 gap-2">
        <Button
          disabled={json == initJson || jsonError != null}
          onClick={() => {
            const parseResult = parseJson(json);
            if (parseResult.kind == "ok") {
              onSave(parseResult.items);
            }
          }}
        >
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
      {jsonError != null && <p className="m-2 text-destructive">{jsonError}</p>}
      <Textarea
        ref={textareaRef}
        value={json}
        onChange={(e) => {
          const parseResult = parseJson(e.target.value);
          if (parseResult.kind == "error") {
            setJsonError(parseResult.msg);
          } else {
            setJsonError(null);
          }
          setJson(e.target.value);
        }}
        className="h-500"
      />
    </>
  );
}

type ConsoleMode = "normal" | "history" | "json";

function App() {
  // dummy state variable to trigger re-render when needed
  const [_, setCounter] = useState<number>(0);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isFilteringByTag, setIsFilteringByTag] = useState<boolean>(false);
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>("normal");
  const updateCounter = () => setCounter((c) => c + 1);
  useEffect(() => {
    window.addEventListener("storage", updateCounter);
    return () => {
      window.removeEventListener("storage", updateCounter);
    };
  }, []);

  const currentVersionItems = getOrCreateCurrentVersion()[0].items;
  const currentVersionTags = Array.from(
    new Set(
      Array.from(currentVersionItems.values()).flatMap((item) => item.tags)
    )
  ).sort();
  const filteredItems =
    tagFilter != null
      ? new Map(
          Array.from(currentVersionItems.entries()).filter(([_k, v]) =>
            v.tags.includes(tagFilter)
          )
        )
      : currentVersionItems;

  const getNormalMode = () => (
    <>
      <div className="flex m-2 gap-2">
        <Button
          onClick={() => {
            setIsAddingItem(true);
          }}
        >
          Add item
        </Button>
        {!isFilteringByTag && (
          <Button
            onClick={() => {
              setIsFilteringByTag(true);
              setTagFilter(null);
            }}
          >
            Filter by tag
          </Button>
        )}
        <Button className="ml-auto" onClick={() => setConsoleMode("json")}>
          Edit JSON
        </Button>
        <Button onClick={() => setConsoleMode("history")}>View history</Button>
      </div>
      {isFilteringByTag && (
        <>
          <div className="flex m-2 gap-2 items-center">
            <span>Filter by tag:</span>
            <Select
              onValueChange={(s) => {
                setTagFilter(s);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                {currentVersionTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setIsFilteringByTag(false);
                setTagFilter(null);
              }}
            >
              Clear filter
            </Button>
          </div>
          {tagFilter != null && (
            <p className="m-2">
              Found {filteredItems.size} item
              {filteredItems.size == 1 ? "" : "s"} with tag "{tagFilter}"
            </p>
          )}
        </>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="w-45">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAddingItem && (
            <ItemInputRow
              initialItemName=""
              initialItemQuantity={1}
              initialItemTags={[]}
              onSave={(name, item) => {
                if (writeItemToLocalStorage(null, name, item)) {
                  setIsAddingItem(false);
                }
              }}
              onCancel={() => {
                setIsAddingItem(false);
              }}
            />
          )}
          {getItemRows({
            items: filteredItems,
            onSave: (originalItemName, newItemName, item) => {
              if (
                writeItemToLocalStorage(originalItemName, newItemName, item)
              ) {
                updateCounter();
                return true;
              }
              return false;
            },
            onDelete: (name) => {
              deleteItemFromLocalStorage(name);
              updateCounter();
            },
          })}
        </TableBody>
      </Table>
    </>
  );

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-5">Item Console</h1>
        {consoleMode == "normal" && getNormalMode()}
        {consoleMode == "json" && (
          <JsonMode
            initJson={JSON.stringify(
              itemsToObject(currentVersionItems),
              null,
              2
            )}
            onSave={(items: Map<string, Item>) => {
              writeItemsToLocalStorage(items);
              setConsoleMode("normal");
            }}
            onCancel={() => {
              setConsoleMode("normal");
            }}
          />
        )}
      </div>
    </>
  );
}

export default App;
