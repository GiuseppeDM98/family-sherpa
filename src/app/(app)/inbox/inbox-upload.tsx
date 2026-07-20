"use client";

import { MicIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitAppMessage } from "./actions";

const ACCEPTED_FILE_TYPES = "audio/*,image/*,application/pdf";
const RECORDING_MIME_TYPE = "audio/webm";

/**
 * The in-app upload channel: a text field, a file picker, and a minimal
 * record/stop control. `MediaRecorder`
 * produces `audio/webm`, which Groq Whisper accepts as-is, so nothing is
 * transcoded client-side.
 */
export function InboxUpload() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  function reset() {
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function send(payloadFile: File | null) {
    const formData = new FormData();
    formData.set("text", text);
    if (payloadFile) formData.set("file", payloadFile);

    startTransition(async () => {
      const result = await submitAppMessage(formData);
      if (result.ok) {
        reset();
        // The pipeline runs inline, so by the time this resolves the message is
        // already parsed and waiting in the list below.
        router.refresh();
        toast.success("Analizzato! Controlla qui sotto.");
      } else {
        toast.error(result.error);
      }
    });
  }

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Non riesco ad accedere al microfono. Controlla i permessi del browser.");
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = () => {
      // Release the mic indicator as soon as we have the audio, not whenever
      // the page happens to be unloaded.
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      send(new File([new Blob(chunks, { type: RECORDING_MIME_TYPE })], "vocale.webm", {
        type: RECORDING_MIME_TYPE,
      }));
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <Card>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            send(file);
          }}
        >
          <Input
            name="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Scrivi o allega — es. «bollo Panda 87,50 entro il 31 gennaio»"
            disabled={isPending || isRecording}
          />

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending || isRecording}
            >
              <PaperclipIcon />
              Allega
            </Button>

            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isPending}
            >
              {isRecording ? <SquareIcon /> : <MicIcon />}
              {isRecording ? "Ferma e invia" : "Registra"}
            </Button>

            <Button
              type="submit"
              size="sm"
              className="ml-auto"
              disabled={isPending || isRecording || (!text.trim() && !file)}
            >
              {isPending ? "Analizzo…" : "Invia"}
            </Button>
          </div>

          {file ? (
            <p className="text-muted-foreground truncate text-xs">Allegato: {file.name}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
