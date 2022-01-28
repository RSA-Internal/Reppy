package panda.reppy.listeners;

import net.dv8tion.jda.api.events.interaction.ButtonClickEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import panda.reppy.commands.buttons.Accept;
import panda.reppy.commands.buttons.Downvote;
import panda.reppy.commands.buttons.Upvote;

public class ButtonListener extends ListenerAdapter {

    @Override
    public void onButtonClick(ButtonClickEvent event) {
        String buttonId = event.getComponentId();

        switch (buttonId) {
            case "upvote" -> Upvote.process(event);
            case "downvote" -> Downvote.process(event);
            case "accept" -> Accept.process(event);
            default -> event.reply("Invalid buttonId received.").setEphemeral(true).queue();
        }
    }
}
