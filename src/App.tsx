import {
  faHistory,
  faMicrophone,
  faPaperPlane,
  faPlus,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";

// --- TYPESCRIPT INTERFACES ---

/** Defines the structure for a single chat message. */
interface Message {
  id: number;
  content: string;
  sender: "user" | "model";
}

/** Defines the structure for a chat session in the history list. */
interface ChatSession {
  id: number;
  title: string;
}

// --- STUBBED DATA ---

const dummyHistory: ChatSession[] = [
  { id: 1, title: "React 19 vs 18 Changes" },
  { id: 2, title: "ESLint & TypeScript Setup" },
  { id: 3, title: "Vite Configuration Guide" },
];

const initialMessages: Message[] = [
  {
    id: 1,
    content:
      "Hello! I am a clone interface ready to help you with your next request. How can I assist?",
    sender: "model",
  },
  {
    id: 2,
    content: "What has changed between react 18 and the current version?",
    sender: "user",
  },
];

/** Renders a single message bubble. */
interface MessageItemProps {
  message: Message;
}
const MessageItem: React.FC<MessageItemProps> = ({ message }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
      my: 2,
      mx: message.sender === "model" ? 0 : 2, // Model messages might span full width
    }}
  >
    <Paper
      elevation={2}
      sx={{
        p: 1.5,
        maxWidth: "70%",
        borderRadius: "12px",
        borderBottomLeftRadius: message.sender === "model" ? 0 : "12px",
        borderBottomRightRadius: message.sender === "user" ? 0 : "12px",
        bgcolor: message.sender === "user" ? "#1976D2" : "#303030", // Blue for User, Dark Gray for Model
        color: "white",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      }}
    >
      <Typography variant="body1">{message.content}</Typography>
    </Paper>
  </Box>
);

const App = () => {
  // IMPORTANT: For Vite, static assets in the 'public' folder must be referenced
  // with a path relative to the root, like '/assets/...'
  const imagePath = "/assets/gallerybanner.png";
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false); // Stubbed state for loading indicator

  // Stub function for handling the send button click
  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isSending) return;

    // 1. Stub: Set loading state
    setIsSending(true);

    // 2. Stub: Add user message to state
    const newUserMessage: Message = {
      id: Date.now(),
      content: input,
      sender: "user",
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");

    // 3. Stub: Simulate API call delay for model response
    setTimeout(() => {
      const newModelMessage: Message = {
        id: Date.now() + 1,
        content:
          "This is the stubbed AI response for: '" +
          newUserMessage.content.substring(0, 30) +
          "...' The structure works!",
        sender: "model",
      };
      setMessages((prev) => [...prev, newModelMessage]);
      setIsSending(false); // End loading
    }, 1500);
  }, [input, isSending]);

  // Stub function for starting a new chat
  const handleNewChat = useCallback(() => {
    console.log("Stub: Starting a new chat session.");
    setMessages([]); // Clear messages for a "new" chat
    setInput("");
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "#171717",
        color: "white",
      }}
    >
      {/* 1. SIDEBAR (Navigation and History) */}
      <Box
        component="nav"
        sx={{
          width: 250,
          flexShrink: 0,
          bgcolor: "#212121",
          borderRight: "1px solid #333",
          p: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleNewChat}
          startIcon={<FontAwesomeIcon icon={faPlus} />}
          sx={{ mb: 2, py: 1.5, fontWeight: "bold" }}
        >
          New Chat
        </Button>

        <Divider sx={{ mb: 2, bgcolor: "#444" }} />

        <Typography
          variant="subtitle2"
          sx={{ color: "#aaa", mb: 1, textTransform: "uppercase" }}
        >
          <FontAwesomeIcon icon={faHistory} style={{ marginRight: "8px" }} />
          History
        </Typography>

        <List sx={{ flexGrow: 1, overflowY: "auto" }}>
          {dummyHistory.map((session) => (
            <ListItem key={session.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#303030" },
                  bgcolor: session.id === 1 ? "#303030" : "transparent", // Highlight active chat
                }}
              >
                <ListItemText
                  primary={session.title}
                  primaryTypographyProps={{ noWrap: true, color: "white" }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mt: "auto", mb: 1, bgcolor: "#444" }} />

        <Button
          fullWidth
          sx={{
            justifyContent: "flex-start",
            color: "white",
            "&:hover": { bgcolor: "#303030" },
          }}
          startIcon={<FontAwesomeIcon icon={faUserCircle} size="lg" />}
        >
          User Settings
        </Button>
      </Box>

      {/* 2. MAIN CONTENT AREA */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative", // For fixed footer
        }}
      >
        <img
          src={imagePath}
          alt="Gallery Banner"
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        {/* 2a. MESSAGE HISTORY (Scrollable) */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 4, pt: 8 }}>
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
          {isSending && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                my: 2,
                pl: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: "#aaa" }}>
                Model is typing...
              </Typography>
            </Box>
          )}
        </Box>

        {/* 2b. FIXED INPUT AREA */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            width: "auto",
            py: 2,
            px: 4,
            bgcolor: "#171717",
            boxShadow: "0 -4px 10px rgba(0,0,0,0.5)", // Shadow at the top
            zIndex: 10,
          }}
        >
          <Container maxWidth="xl" sx={{ p: 0 }}>
            <Paper
              elevation={3}
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: "25px",
                bgcolor: "#303030",
              }}
            >
              <TextField
                fullWidth
                multiline
                placeholder="Message Gemini..."
                variant="standard"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                sx={{
                  flexGrow: 1,
                  mx: 1,
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInput-underline:before": { borderBottom: "none" },
                  "& .MuiInput-underline:after": { borderBottom: "none" },
                  "&:hover .MuiInput-underline:before": {
                    borderBottom: "none !important",
                  },
                }}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <Button sx={{ minWidth: 0, p: 1, borderRadius: "50%" }}>
                <FontAwesomeIcon icon={faMicrophone} color="#aaa" />
              </Button>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  minWidth: 0,
                  p: 1,
                  ml: 1,
                  borderRadius: "50%",
                  height: "40px",
                  width: "40px",
                }}
                disabled={!input.trim() || isSending}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </Button>
            </Paper>
            <Typography variant="caption" color="#aaa" sx={{ mt: 1 }}>
              This is a clone UI. The model is stubbed.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
