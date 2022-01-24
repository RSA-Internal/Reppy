package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import panda.reppy.commands.ConditionalCommand;
import panda.reppy.entities.BotMongoClient;
import panda.reppy.util.constants.CommandConditionConstants;

import java.net.UnknownHostException;

public class Stop extends ConditionalCommand {

    public Stop() {
        super("stop", "Stops the bot in a safe manner.", CommandConditionConstants.OWNER_CONDITION);
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        boolean valid = super.execute(event);

        if (valid) {
            event.reply("Shutting down safely.").setEphemeral(true).queue(success -> {
                try {
                    BotMongoClient.getMongoClient().close();
                } catch (UnknownHostException e) {
                    System.out.println("No MongoClient to close.");
                }
                event.getJDA().shutdown();
            });
        }

        return valid;
    }
}
