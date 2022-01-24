package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import panda.reppy.commands.BaseCommand;
import panda.reppy.database.ModelDao;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.entities.QuestionBuilder;
import panda.reppy.util.constants.SnowflakeConstants;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class PostQuestion extends BaseCommand {

    private final static List<String> CANCEL_WORDS = Arrays.asList("stop", "quit");

    private final Set<String> current;
    private final Map<String, QuestionBuilder> builderMap;

    public PostQuestion() {
        super("post-question", "Begin the process of posting a question.");

        this.current = new HashSet<>();
        this.builderMap = new HashMap<>();
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
        // TODO Implement similarity check on titles
//        List<ThreadChannel> threads = threadChannel.getThreadChannels();
//        for (ThreadChannel thread : threads) {
//            // TODO - Check for similar instead of exact.
//            if (thread.getName().equals(title)) {
//                // - Reply with any matches and return
//                event.reply("Found matching channel here <#" + thread.getId() + ">.")
//                        .setEphemeral(true).queue(response ->
//                                response.deleteOriginal().queueAfter(30, TimeUnit.SECONDS));
//                return true;
//            }
//        }

        current.add(memberId);
        builderMap.put(memberId, new QuestionBuilder(memberId));

        event.getTextChannel()
                .createThreadChannel(String.format("Question Building for %s", member.getEffectiveName()), true)
                .queue(thread -> {
                    thread.addThreadMember(member).queue();
                    thread.sendMessage(member.getAsMention() + ", Welcome to your personal Question Builder.")
                            .queue();
                    waitForResponse(event, thread, event.getIdLong());
                });

        event.reply("Question posted.").queue();
        return true;
    }

    private String formatStatus(String value) {
        if (value != null) {
            return "[ set ]";
        }
        return "[unset]";
    }

    private String generateThreadStatus(String memberId) {
        QuestionBuilder questionBuilder = builderMap.get(memberId);

        String status = String.format(
                "Reply with any of the fields below to begin.\n\n" +
                "- %s Title*\n" +
                "- %s Body*\n" +
                "- %s Codeblock\n" +
                "- %s Output\n\n" +
                "Reply `done` when you are finished building your question.\n" +
                "Reply `quit` when you no longer want to build a question.",
                formatStatus(questionBuilder.getTitle()),
                formatStatus(questionBuilder.getBody()),
                formatStatus(questionBuilder.getCodeblock()),
                formatStatus(questionBuilder.getOutput())
        );

        return status;
    }

    private void handleTitle(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String title = questionBuilder.getTitle();
        if (title != null) {
            thread.sendMessage("You currently have a title set.\n" +
                            "Title: " + title + "\n\n" +
                            "If you do not want to override your current title, please reply with `back`.")
                    .queue();
        } else {
            thread.sendMessage("Please provide what the title of your question should be.").queue();
        }

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("back")) {
                waitForResponse(event, thread, message.getIdLong());
            }

            questionBuilder.setTitle(content);
            waitForResponse(event, thread, message.getIdLong());
        });
    }

    private void handleBody(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String body = questionBuilder.getBody();
        if (body != null) {
            thread.sendMessage("You currently have a body set.\n" +
                            "Body: " + body + "\n\n" +
                            "If you do not want to override your current body, please reply with `back`.")
                    .queue();
        } else {
            thread.sendMessage("Please provide what the body of your question should be.").queue();
        }

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("back")) {
                waitForResponse(event, thread, message.getIdLong());
            }

            questionBuilder.setBody(content);
            waitForResponse(event, thread, message.getIdLong());
        });
    }

    private void handleCodeblock(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String codeblock = questionBuilder.getCodeblock();
        if (codeblock != null) {
            thread.sendMessage("You currently have a codeblock set.\n" +
                            "Codeblock: " + codeblock + "\n\n" +
                            "If you do not want to override your current codeblock, please reply with `back`.")
                    .queue();
        } else {
            thread.sendMessage("Please provide what the codeblock of your question should be.").queue();
        }

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("back")) {
                waitForResponse(event, thread, message.getIdLong());
            }

            if (content.contains("```lua")) content = content.replace("```lua", "");
            if (content.contains("`")) content = content.replaceAll("`", "");

            content = "```lua\n" + content + "\n```";

            questionBuilder.setCodeblock(content);
            waitForResponse(event, thread, message.getIdLong());
        });
    }

    private void handleOutput(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String output = questionBuilder.getOutput();
        if (output != null) {
            thread.sendMessage("You currently have an output log set.\n" +
                            "Output: " + output + "\n\n" +
                            "If you do not want to override your current output, please reply with `back`.")
                    .queue();
        } else {
            thread.sendMessage("Please provide what the output of your question should be.").queue();
        }

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("back")) {
                waitForResponse(event, thread, message.getIdLong());
            }

            if (content.contains("`")) content = content.replaceAll("`", "");

            content = "```\n" + content + "\n```";

            questionBuilder.setOutput(content);
            waitForResponse(event, thread, message.getIdLong());
        });
    }

    private void waitForResponse(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        thread.sendMessage(generateThreadStatus(event.getMember().getId())).queue();
        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw().toLowerCase();

            switch(content) {
                case "title":
                    handleTitle(event, thread, message.getIdLong());
                    break;
                case "body":
                    handleBody(event, thread, message.getIdLong());
                    break;
                case "codeblock":
                    handleCodeblock(event, thread, message.getIdLong());
                    break;
                case "output":
                    handleOutput(event, thread, message.getIdLong());
                    break;
                case "done":
                    // TODO Implement checks on Title and Body
                    QuestionBuilder builder = builderMap.get(event.getMember().getId());
                    String title = builder.getTitle();
                    String body = builder.getBody();
                    boolean complete = true;


                    if (title == null) {
                        complete = false;
                        thread.sendMessage("Title is unset, please set the title of your question.").queue();
                    } else if (title.split(" ").length < 6) {
                        complete = false;
                        thread.sendMessage("Title was not descriptive enough, please try a better title.").queue();
                    }

                    if (body == null) {
                        complete = false;
                        thread.sendMessage("Body is unset, please set the body of your question.").queue();
                    } else if (body.split(" ").length < 25) {
                        complete = false;
                        thread.sendMessage("There is not enough content in your question, please provide more " +
                                        "details.")
                                .queue();
                    }

                    if (!complete) {
                        waitForResponse(event, thread, message.getIdLong());
                    } else {
                        postQuestion(event, thread);
                    }

                    break;
                case "quit":
                    cleanMessages(event, thread);
                    break;
                default:
                    thread.sendMessage(String.format("%s is not a valid option. Please try `title`, `body`, " +
                                    "`codeblock`, `output`, `done`, or `quit`.", content)).queue();
                    waitForResponse(event, thread, message.getIdLong());
                    break;
            }
        });
    }

    private void postQuestion(SlashCommandEvent event, ThreadChannel thread) {
        Guild guild = event.getGuild();
        TextChannel channel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);
        Member member = event.getMember();
        QuestionBuilder builder = builderMap.get(member.getId());

        channel.createThreadChannel(builder.getTitle()).queue(postedThread -> {
            postedThread.sendMessage("**Question posted by: " + event.getMember().getAsMention() + "**\n\n" +
                    builder.getBody()).queue(message -> postedThread.pinMessageById(message.getId()).queue());
            if (builder.getCodeblock() != null) {
                postedThread.sendMessage(builder.getCodeblock()).queue();
            }
            if (builder.getOutput() != null) {
                postedThread.sendMessage(builder.getOutput()).queue();
            }

            ModelDao.generateQuestionModel(postedThread, builder);
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
            }, 5, TimeUnit.MINUTES, new Timeout(event, thread));
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
        private final ThreadChannel thread;
        private boolean ran = false;

        private Timeout(SlashCommandEvent event, ThreadChannel thread)
        {
            this.event = event;
            this.thread = thread;
        }

        @Override
        public void run()
        {
            if(ran)
                return;
            ran = true;
            thread.sendMessage("Uh oh! You took longer than 5 minutes to respond, "
                    + event.getMember().getAsMention() + "!").queue();
            current.remove(event.getUser().getId());
            cleanMessages(event, thread);
        }
    }
}
