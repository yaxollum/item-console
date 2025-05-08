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

interface Item {
  quantity: number;
  tags: [string];
}

interface Version {
  items: Map<string, Item>;
  previousVersion: string;
  timestamp: string;
}

function App() {
  const CURRENT_VERSION_KEY = "currentVersion";
  const VERSION_KEY_PREFIX = "data-version-";
  // const [count, setCount] = useState(0);
  const [versions, setVersions] = useState<Map<string, Version>>(new Map());
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const syncLocalStorage = () => {
    if (localStorage.getItem(CURRENT_VERSION_KEY) == null) {
      initializeLocalStorage();
    }
    const currentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
    const versions = new Map(
      Object.entries(localStorage).flatMap(([k, v]: [string, string]) => {
        if (k.startsWith(VERSION_KEY_PREFIX)) {
          return [[k, JSON.parse(v)]];
        } else {
          return [];
        }
      })
    );
    setVersions(versions);
    setCurrentVersion(currentVersion);
  };
  useEffect(() => {
    window.addEventListener("storage", syncLocalStorage);
    return () => {
      window.removeEventListener("storage", syncLocalStorage);
    };
  }, []);
  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center">Item Console</h1>
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
            <TableRow>
              <TableCell>
                INV00oeuoueoeu asoeuhasoeu snthaoeuouoauoa aoeaoueoaueoaue1
              </TableCell>
              <TableCell>Paid</TableCell>
              <TableCell className="whitespace-break-spaces">
                Credit santeuohs snathoues snthaoeusnt s aoeuntshaosuetnh
                snthaoeustnh ouesnthsntoaehusnth snoethust Card
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Button>Edit</Button>
                <Button className="m-2">Delete</Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <p>Hello world</p>

        <p className="text-red-500">Hello world</p>
      </div>
    </>
  );
}

export default App;
