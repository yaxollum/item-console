import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sha256 } from "js-sha256";

interface Item {
  quantity: number;
  tags: string[];
}

interface Version {
  items: Map<string, Item>;
  previousVersion: string | null;
  timestamp: string;
}

function objectToVersion(o: any): Version {
  return {
    items: new Map(Object.entries(o.items)),
    previousVersion: o.previousVersion,
    timestamp: o.timestamp,
  };
}

function versionToObject(v: Version): any {
  return {
    items: Object.fromEntries(v.items.entries()),
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

function getTableRows() {
  const currentVersion = getOrCreateCurrentVersion()[0];
  const tableRows = Array.from(currentVersion.items.entries()).map(
    ([name, item]) => (
      <TableRow key={name}>
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
          <Button>Edit</Button>
          <Button className="ml-2">Delete</Button>
        </TableCell>
      </TableRow>
    )
  );
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
  onSave,
  onCancel,
}: {
  onSave: (itemName: string, item: Item) => void;
  onCancel: () => void;
}) {
  const [itemName, setItemName] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<string>("");
  const [itemTags, setItemTags] = useState<string>("");
  return (
    <TableRow>
      <TableCell>
        <Input
          type="text"
          placeholder="Item name"
          onChange={(e) => {
            setItemName(e.target.value);
          }}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          placeholder="Quantity"
          onChange={(e) => {
            setItemQuantity(e.target.value);
          }}
        />
      </TableCell>
      <TableCell>
        <Input
          type="text"
          placeholder="Tags (separated by commas)"
          onChange={(e) => {
            setItemTags(e.target.value);
          }}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Button
          onClick={() => {
            const q = Number.parseInt(itemQuantity);
            onSave(itemName, {
              quantity: q >= 0 ? q : 1,
              tags: commaSeparatedToArray(itemTags),
            });
          }}
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
function App() {
  // dummy state variable to trigger re-render when needed
  const [_, setCounter] = useState<number>(0);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const updateCounter = () => setCounter((c) => c + 1);
  useEffect(() => {
    window.addEventListener("storage", updateCounter);
    return () => {
      window.removeEventListener("storage", updateCounter);
    };
  }, []);

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-5">Item Console</h1>
        <div className="flex m-2">
          <Button
            onClick={() => {
              setIsAddingItem(true);
            }}
          >
            Add Item
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingItem && (
              <ItemInputRow
                onSave={(name, item) => {
                  const [currentVersion, currentSha] =
                    getOrCreateCurrentVersion();
                  const currentItems = currentVersion.items;
                  console.log(
                    currentItems,
                    name,
                    currentItems.has(name),
                    Array.from(currentItems.entries())
                  );
                  if (currentItems.has(name)) {
                    alert(`Item with name "${name}" already exists.`);
                    return;
                  }
                  currentItems.set(name, item);
                  writeVersionToLocalStorage(
                    makeVersion(currentItems, currentSha)
                  );
                  setIsAddingItem(false);
                }}
                onCancel={() => {
                  setIsAddingItem(false);
                }}
              />
            )}
            {getTableRows()}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default App;
