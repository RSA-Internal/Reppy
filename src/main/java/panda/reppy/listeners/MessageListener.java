package panda.reppy.listeners;

import net.dv8tion.jda.api.entities.ChannelType;
import net.dv8tion.jda.api.entities.Message;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import panda.reppy.util.constants.SnowflakeConstants;

public class MessageListener extends ListenerAdapter {

    @Override
    public void onMessageReceived(MessageReceivedEvent event) {
        if (event.isFromType(ChannelType.PRIVATE)) {
            System.out.printf("[PM] %s: %s\n", event.getAuthor().getName(),
                    event.getMessage().getContentDisplay());
        } else {
            final Message message = event.getMessage();

            final String authorId = event.getAuthor().getId();
            final String messageContent = message.getContentDisplay();

            if (event.getChannel().getId().equals(SnowflakeConstants.ASK_QUESTION_CHANNEL_ID)) {
                if (!authorId.equals(SnowflakeConstants.BOT_OWNER_ID)) {
                    message.delete().queue();
                }
            }

            if (authorId.equals(SnowflakeConstants.BOT_OWNER_ID)) {
                if (messageContent.equals("r!stop")) {
                    event.getMessage().reply("Shutting down safely.").queue(success -> event.getJDA().shutdown());
                }
            }
        }
    }
}
