package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.interactions.commands.OptionType;
import panda.reppy.commands.BaseCommand;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.util.constants.SnowflakeConstants;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class PostQuestion extends BaseCommand {

    private final static List<String> CANCEL_WORDS = Arrays.asList("cancel", "stop", "quit");

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
            event.reply("You are already building a question.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        Guild guild = event.getGuild();
        if (guild == null) {
            event.reply("Failed to fetch guild.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        TextChannel threadChannel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);
        if (threadChannel == null) {
            event.reply("Failed to fetch thread channel.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        // Check for previous questions with similar titles
        List<ThreadChannel> threads = threadChannel.getThreadChannels();
        for (ThreadChannel thread : threads) {
            // TODO - Check for similar instead of exact.
            if (thread.getName().equals(title)) {
                // - Reply with any matches and return
                event.reply("Found matching channel here <#" + thread.getId() + ">.")
                        .setEphemeral(true).queue(response ->
                                response.deleteOriginal().queueAfter(30, TimeUnit.SECONDS));
                return true;
            }
        }

        current.add(memberId);

        event.getTextChannel()
                .createThreadChannel(String.format("Question Building for %s", member.getEffectiveName()), true)
                .queue(thread -> {
                    thread.addThreadMember(member).queue();
                    thread.sendMessage(member.getAsMention()
                        + ", please describe your question in your next message — remember to be specific." +
                                "\nYou can say `cancel`, `stop`, or `quit` at any time to stop this process.")
                        .queue();
                    waitForBody(event, thread, title, event.getIdLong());
                });

        event.reply("Question posted.").queue(response ->
                response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
        return true;
    }

    private void waitForBody(SlashCommandEvent event, ThreadChannel thread, String title, long lastMessage) {
        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String query = message.getContentRaw();
            User user = message.getAuthor();

            thread.sendMessage("Great, " + event.getMember().getAsMention()
                   + ". Please post any code that is relevant to your issue. If you do not have any code, type `skip`.")
                    .queue();
            waitForCodeBlock(event, thread, title, query, e.getMessageIdLong());
        });
    }

    private void waitForCodeBlock(SlashCommandEvent event, ThreadChannel thread, String title, String body, long lastMessage) {
        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String query = message.getContentRaw();
            User user = message.getAuthor();

            thread.sendMessage("Awesome job, " + event.getMember().getAsMention()
                    + "! Give me a few moments, and your question will be posted.")
                    .queue();
            postQuestion(event, thread, title, body, query);
        });
    }

    private void postQuestion(SlashCommandEvent event, ThreadChannel thread, String title, String body, String codeblocks) {
        Guild guild = event.getGuild();
        TextChannel channel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);

        assert channel != null;
        channel.createThreadChannel(title).queue(postedThread -> {
            postedThread.sendMessage("**Question posted by: " + event.getMember().getAsMention()
                    + "**\n\n" + body).queue(message -> {
                        postedThread.pinMessageById(message.getId()).queue();
            });
            if (!codeblocks.equals("skip")) {
                postedThread.sendMessage(codeblocks).queue();
            }
            cleanMessages(event, thread);
        });
    }

    private void wait(SlashCommandEvent event, ThreadChannel thread, long lastMessage, Consumer<MessageReceivedEvent> action) {
        getWaiter(event).waitForGuildMessageReceived(
            e -> e.getAuthor().equals(event.getUser()) && e.getChannel().equals(thread)
                    && e.getMessageIdLong() != lastMessage,
            e -> {
                if (CANCEL_WORDS.contains(e.getMessage().getContentRaw().toLowerCase())) {
                    current.remove(event.getUser().getId());
                    cleanMessages(event, thread);
                    e.getMessage().delete().queue();
                    return;
                }
                action.accept(e);
            }, 2, TimeUnit.MINUTES, new Timeout(event));
    }

    private void cleanMessages(SlashCommandEvent event, ThreadChannel thread) {
        String userId = event.getUser().getId();

        if (thread != null && event.getGuild().getThreadChannelById(thread.getId()) != null) {
            thread.delete().queue();
        }

        current.remove(userId);
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
