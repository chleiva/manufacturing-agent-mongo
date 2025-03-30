import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  url: string;
  isReferenced?: boolean;
}

interface DocumentSidebarProps {
  documents?: Document[];
  isOpen?: boolean;
  onToggle?: () => void;
  onViewDocument?: (document: Document) => void;
  onDownloadDocument?: (document: Document) => void;
}

const DocumentSidebar = ({
  documents = [
    {
      id: "1",
      name: "Project Requirements.pdf",
      url: "#",
      isReferenced: true,
    },
    {
      id: "2",
      name: "Technical Specifications.pdf",
      url: "#",
      isReferenced: false,
    },
    {
      id: "3",
      name: "User Manual.pdf",
      url: "#",
      isReferenced: false,
    },
  ],
  isOpen = true,
  onToggle = () => {},
  onViewDocument = () => {},
  onDownloadDocument = () => {},
}: DocumentSidebarProps) => {
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
        isOpen ? "w-[300px]" : "w-[40px]",
      )}
    >
      <div className="flex items-center justify-between p-4">
        {isOpen && <h2 className="text-lg font-semibold">Documents</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </Button>
      </div>
      <Separator />

      {isOpen ? (
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "group relative rounded-lg border p-3 transition-all hover:bg-accent",
                  doc.isReferenced && "border-primary/50 bg-primary/5",
                )}
                onMouseEnter={() => setHoveredDocId(doc.id)}
                onMouseLeave={() => setHoveredDocId(null)}
              >
                <div className="flex items-start gap-3">
                  <FileText
                    className={cn(
                      "h-5 w-5 shrink-0",
                      doc.isReferenced
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                  </div>
                </div>

                <div
                  className={cn(
                    "absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity",
                    hoveredDocId === doc.id && "opacity-100",
                  )}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onViewDocument(doc)}
                        >
                          <Eye size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>View document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDownloadDocument(doc)}
                        >
                          <Download size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Download document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-start pt-4">
          {documents
            .filter((doc) => doc.isReferenced)
            .map((doc) => (
              <TooltipProvider key={doc.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-2 text-primary"
                      onClick={() => {
                        onToggle();
                      }}
                    >
                      <FileText size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{doc.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
        </div>
      )}
    </div>
  );
};

export default DocumentSidebar;
