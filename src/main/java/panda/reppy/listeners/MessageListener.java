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
            final Message MESSAGE = event.getMessage();

            final String AUTHOR_ID = event.getAuthor().getId();
            final String MESSAGE_CONTENT = MESSAGE.getContentDisplay();

            if (AUTHOR_ID.equals(SnowflakeConstants.BOT_OWNER_ID)) {
                if (MESSAGE_CONTENT.equals("stop")) {
                    event.getMessage().reply("Shutting down safely.").queue(success -> {
                        event.getJDA().shutdown();
                    });
                }
            }
        }
    }
}
