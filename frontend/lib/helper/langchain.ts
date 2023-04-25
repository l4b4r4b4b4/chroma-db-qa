import { TransformedChatGPTAgent, TransformedChatGPTMessage } from "@/typings";
import { ChatGPTMessage } from "../APIs/OpenAIStream";

export function transformChatGPTMessages(
  messages: ChatGPTMessage[]
): TransformedChatGPTMessage[] {
  return messages.map((message) => {
    let transformedRole: TransformedChatGPTAgent;
    // console.log("TRANSFORMING GPT Messages", messages);
    switch (message.role) {
      case "user":
        transformedRole = "userMessage";
        break;
      case "assistant":
        transformedRole = "apiMessage";
        break;
      default:
        transformedRole = message.role;
    }

    return {
      type: transformedRole,
      message: message.content,
    };
  });
}
