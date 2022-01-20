package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.interactions.commands.OptionType;
import panda.reppy.commands.BaseCommand;
import panda.reppy.commands.ConditionalCommand;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.flags.QuestionState;
import panda.reppy.flags.StageState;
import panda.reppy.util.constants.CommandConditionConstants;
import panda.reppy.util.constants.SnowflakeConstants;

import java.sql.Time;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class PostQuestion extends BaseCommand {

    private final Set<String> current;

    public PostQuestion() {
        super("post-question", "Begin the process of posting a question.");

        this.current = new HashSet<>();

        addOption(OptionType.STRING, "title", "The Title of your question.", true);
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        if (!event.getTextChannel().getId().equals(SnowflakeConstants.ASK_QUESTION_CHANNEL_ID)) {
            event.reply("Please use <#" + SnowflakeConstants.ASK_QUESTION_CHANNEL_ID + "> to ask questions.")
                    .setEphemeral(true).queue();
            return false;
        }

        final Member member = event.getMember();

        final String memberId = member.getId();
        final String title = event.getOptionsByName("title").get(0).getAsString();

        if (current.contains(memberId)) {
            event.reply("You are already building a question.").queue();
            return false;
        }

        Guild guild = event.getGuild();
        if (guild == null) {
            event.reply("Failed to fetch guild.").queue();
            return false;
        }

        TextChannel threadChannel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);
        if (threadChannel == null) {
            event.reply("Failed to fetch thread channel.").queue();
            return false;
        }

        // Check for previous questions with similar titles
        List<ThreadChannel> threads = threadChannel.getThreadChannels();
        for (ThreadChannel thread : threads) {
            // TODO - Check for similar instead of exact.
            if (thread.getName().equals(title)) {
                // - Reply with any matches and return
                event.reply("Found matching channel here <#" + thread.getId() + ">.").setEphemeral(true).queue();
                return true;
            }
        }

        current.add(memberId);

        event.getChannel().sendMessage(member.getAsMention()
                + ", please describe your question in your next message — remember to be specific.").queue();
        waitForBody(event, title, event.getIdLong());

        event.reply("Question posted.").queue();
        return true;
    }

    private void waitForBody(SlashCommandEvent event, String title, long lastMessage) {
        wait(event, lastMessage, e -> {
            String query = e.getMessage().getContentRaw();
            event.getChannel().sendMessage("Great, " + event.getMember().getAsMention()
                   + ". Please post any code that is relevant to your issue. If you do not have any code, type `skip`.").queue();
            waitForCodeBlock(event, title, query, e.getMessageIdLong());
        });
    }

    private void waitForCodeBlock(SlashCommandEvent event, String title, String body, long lastMessage) {
        wait(event, lastMessage, e -> {
            String query = e.getMessage().getContentRaw();
            event.getChannel().sendMessage("Awesome job, " + event.getMember().getAsMention()
                    + "! Give me a few moments, and your question will be posted.").queue();
            postQuestion(event, title, body, query);
        });
    }

    private void postQuestion(SlashCommandEvent event, String title, String body, String codeblocks) {
        Guild guild = event.getGuild();
        TextChannel channel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);

        assert channel != null;
        channel.createThreadChannel(title).queue(thread -> {
            thread.sendMessage("**Question posted by: " + event.getMember().getAsMention()
                    + "**\n\nBody:\n\n" + body).queue();
            if (!codeblocks.equals("skip")) {
                thread.sendMessage("\n\nCodeblocks:\n\n" + codeblocks).queue();
            }
            event.getTextChannel().sendMessage("Here you are, " + event.getMember().getAsMention() + ". "
                    + thread.getAsMention()).queue();
        });
    }

    private void wait(SlashCommandEvent event, long lastMessage, Consumer<MessageReceivedEvent> action) {
        getWaiter(event).waitForGuildMessageReceived(
            e -> e.getAuthor().equals(event.getUser()) && e.getChannel().equals(event.getChannel())
                    && e.getMessageIdLong() != lastMessage,
            e -> {
                action.accept(e);
            }, 2, TimeUnit.MINUTES, new Timeout(event));
    }

    private MessageWaiter getWaiter(SlashCommandEvent event) {
        for(Object ev: event.getJDA().getEventManager().getRegisteredListeners())
            if(ev instanceof MessageWaiter)
                return (MessageWaiter) ev;
        return null;
    }

    private class Timeout implements Runnable
    {
        private final SlashCommandEvent event;
        private boolean ran = false;

        private Timeout(SlashCommandEvent event)
        {
            this.event = event;
        }

        @Override
        public void run()
        {
            if(ran)
                return;
            ran = true;
            event.getTextChannel().sendMessage("Uh oh! You took longer than 2 minutes to respond, "
                    + event.getMember().getAsMention() + "!").queue();
            current.remove(event.getUser().getId());
        }
    }
}
