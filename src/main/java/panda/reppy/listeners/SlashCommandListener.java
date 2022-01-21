package panda.reppy.listeners;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import panda.reppy.commands.BaseCommand;

import java.util.HashMap;
import java.util.Map;

public class SlashCommandListener extends ListenerAdapter {

    private static final Map<String, BaseCommand> commandMap = new HashMap<>();

    public static Map<String, BaseCommand> getCommandMap() { return new HashMap<>(commandMap); }

    public void initCommands(BaseCommand... commands) {
        for (BaseCommand command : commands) {
            initCommand(command);
        }
    }

    private void initCommand(BaseCommand command) {
        commandMap.put(command.getName(), command);
    }

    @Override
    public void onSlashCommand(SlashCommandEvent event) {
        String commandName = event.getName();
        BaseCommand command = commandMap.get(commandName);

        if (command != null) {
            command.execute(event);
        }
    }
}
