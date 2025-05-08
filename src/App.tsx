import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
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

const CURRENT_SHA_KEY = "current-sha";
const VERSION_KEY_PREFIX = "data-version-";

function getTableRows() {
  const currentSha = localStorage.getItem(CURRENT_SHA_KEY);
  if (currentSha == null) {
    return;
  }
  const currentVersionRaw = localStorage.getItem(
    VERSION_KEY_PREFIX + currentSha
  );
  if (currentVersionRaw == null) {
    return;
  }
  const currentVersion = stringToVersion(currentVersionRaw);
  const tableRows = Array.from(currentVersion.items.entries()).map(
    ([name, item]) => (
      <TableRow>
        <TableCell className="font-medium">{name}</TableCell>
        <TableCell>{item.quantity}</TableCell>
        <TableCell>{item.tags}</TableCell>
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
): [Version, string] {
  const obj = {
    items: items,
    previousVersion: previousVersion,
    timestamp: new Date().toISOString(),
  };
  const hash = sha256(versionToString(obj));
  return [obj, hash];
}

function makeExampleVersion(): [Version, string] {
  return makeVersion(
    new Map([
      [
        "Example Item",
        { quantity: 2, tags: ["example tag", "another example tag"] },
      ],
    ]),
    null
  );
}

function initLocalStorage(): void {
  const allVersions = getAllVersions();
  if (allVersions.size == 0) {
    const [newVersion, hash] = makeExampleVersion();
    localStorage.setItem(
      VERSION_KEY_PREFIX + hash,
      versionToString(newVersion)
    );
    initLocalStorage();
    return;
  }
  const currentSha = localStorage.getItem(CURRENT_SHA_KEY);
  if (currentSha == null || localStorage.getItem(currentSha) == null) {
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
  onSave: (itemName: string, itemQuantity: number, itemTags: string) => void;
  onCancel: () => void;
}) {
  const [itemName, setItemName] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<string>("");
  const [itemTags, setItemTags] = useState<string>("");
  return (
    <TableRow>
      <TableCell>
        <input
          type="text"
          className="border-2 rounded-xs border-gray-500"
          onChange={(e) => {
            setItemName(e.target.value);
          }}
        />
      </TableCell>
      <TableCell>
        <input
          type="text"
          className="border-2 rounded-xs border-gray-500"
          onChange={(e) => {
            setItemQuantity(e.target.value);
          }}
        />
      </TableCell>
      <TableCell>
        <input
          type="text"
          className="border-2 rounded-xs border-gray-500"
          onChange={(e) => {
            setItemTags(e.target.value);
          }}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Button
          onClick={() => {
            const q = Number.parseInt(itemQuantity);
            onSave(itemName, q >= 0 ? q : 1, itemTags);
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
  useEffect(() => {
    initLocalStorage();
  });
  /*
  const currentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
  const versions = new Map(
    Object.entries(localStorage).flatMap(([k, v]: [string, string]) => {
      if (k.startsWith(VERSION_KEY_PREFIX)) {
        return [[k, objectToVersion(JSON.parse(v))]];
      } else {
        return [];
      }
    })
  );*/

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-5">Item Console</h1>
        <div className="flex m-2">
          <Button
            onClick={() => {
              console.log("Hello world");
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
                onSave={(name, quantity, tags) => {
                  console.log(`${name} ${quantity} ${tags}`);
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
